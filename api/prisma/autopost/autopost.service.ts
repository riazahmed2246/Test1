import dayjs from 'dayjs';
import { END, START, StateGraph } from '@langchain/langgraph';
import striptags from 'striptags';
import { ChatOpenAI, DallEAPIWrapper } from '@langchain/openai';
import { JSDOM } from 'jsdom';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import Parser from 'rss-parser';
import { IntegrationService } from '../integrations/integration.service';
import { PostsService } from '../posts/posts.service';
import { makeId } from '../../utils/makeId';
import AutoPost from '../../models/autoPost.model';
const parser = new Parser();

interface WorkflowChannelsState {
  messages: BaseMessage[];
  integrations: Integration[];
  body: AutoPost;
  description: string;
  image: string;
  id: string;
  load: {
    date: string;
    url: string;
    description: string;
  };
}

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
  model: 'gpt-4.1',
  temperature: 0.7,
});

const dalle = new DallEAPIWrapper({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
  model: 'gpt-image-1',
});

const generateContent = z.object({
  socialMediaPostContent: z
    .string()
    .describe('Content for social media posts max 120 chars'),
});

const dallePrompt = z.object({
  generatedTextToBeSentToDallE: z
    .string()
    .describe('Generated prompt from description to be sent to DallE'),
});

class AutopostService {
  constructor(
    autopostsRepository,
    workerServiceProducer,
    integrationService,
    postsService
  ) {
    this.autopostsRepository = autopostsRepository;
    this.workerServiceProducer = workerServiceProducer;
    this.integrationService = integrationService;
    this.postsService = postsService;
  }

  async stopAll(org) {
    const getAll = (await this.getAutoposts(org)).filter((f) => f.active);
    for (const autopost of getAll) {
      await this.changeActive(org, autopost.id, false);
    }
  }

  async getAutoposts(orgId) {
    return this.autopostsRepository.getAutoposts(orgId);
  }

  async createAutopost(orgId, body, id) {
    const data = await this.autopostsRepository.createAutopost(orgId, body, id);
    await this.processCron(body.active, data.id);
    return data;
  }

  async changeActive(orgId, id, active) {
    const data = await this.autopostsRepository.changeActive(orgId, id, active);
    await this.processCron(active, id);
    return data;
  }

  async processCron(active, id) {
    if (active) {
      return this.workerServiceProducer.emit('cron', {
        id,
        options: {
          every: 3600000,
          immediately: true,
        },
        payload: {
          id,
        },
      });
    }
    return this.workerServiceProducer.deleteScheduler('cron', id);
  }

  async deleteAutopost(orgId, id) {
    const data = await this.autopostsRepository.deleteAutopost(orgId, id);
    await this.processCron(false, id);
    return data;
  }

  async loadXML(url) {
    try {
      const { items } = await parser.parseURL(url);
      const findLast = items.reduce(
        (all, current) => {
          if (dayjs(current.pubDate).isAfter(all.pubDate)) {
            return current;
          }
          return all;
        },
        { pubDate: dayjs().subtract(100, 'years') }
      );
      return {
        success: true,
        date: findLast.pubDate,
        url: findLast.link,
        description: striptags(
          findLast?.['content:encoded'] ||
            findLast?.content ||
            findLast?.description ||
            ''
        )
          .replace(/\n/g, ' ')
          .trim(),
      };
    } catch (err) {}
    return { success: false };
  }

  static state = () =>
    new StateGraph({
      channels: {
        messages: {
          reducer: (currentState, updateValue) =>
            currentState.concat(updateValue),
          default: () => [],
        },
        body: null,
        description: null,
        load: null,
        image: null,
        integrations: null,
        id: null,
      },
    });

  async loadUrl(url) {
    try {
      const loadDom = new JSDOM(await (await fetch(url)).text());
      loadDom.window.document
        .querySelectorAll('script')
        .forEach((s) => s.remove());
      loadDom.window.document
        .querySelectorAll('style')
        .forEach((s) => s.remove());
      return striptags(loadDom.window.document.body.innerHTML);
    } catch (err) {
      return '';
    }
  }

  async generateDescription(state) {
    if (!state.body.generateContent) {
      return {
        ...state,
        description: state.body.content,
      };
    }
    const description =
      state.load.description || (await this.loadUrl(state.load.url));
    if (!description) {
      return {
        ...state,
        description: '',
      };
    }
    const structuredOutput = model.withStructuredOutput(generateContent);
    const { socialMediaPostContent } = await ChatPromptTemplate.fromTemplate(
      `\n        You are an assistant that gets raw 'description' of a content and generate a social media post content.\n        Rules:\n        - Maximum 100 chars\n        - Try to make it a short as possible to fit any social media\n        - Add line breaks between sentences (\\n) \n        - Don't add hashtags\n        - Add emojis when needed\n        \n        'description':\n        {content}\n      `
    )
      .pipe(structuredOutput)
      .invoke({
        content: description,
      });
    return {
      ...state,
      description: socialMediaPostContent,
    };
  }

  async generatePicture(state) {
    const structuredOutput = model.withStructuredOutput(dallePrompt);
    const { generatedTextToBeSentToDallE } =
      await ChatPromptTemplate.fromTemplate(
        `\n        You are an assistant that gets description and generate a prompt that will be sent to DallE to generate pictures.\n        \n        content:\n        {content}\n      `
      )
        .pipe(structuredOutput)
        .invoke({
          content: state.load.description || state.description,
        });
    const image = await dalle.invoke(generatedTextToBeSentToDallE);
    return { ...state, image };
  }

  async schedulePost(state) {
    const nextTime = await this.postsService.findFreeDateTime(
      state.integrations[0].organizationId
    );
    await this.postsService.createPost(state.integrations[0].organizationId, {
      date: nextTime + 'Z',
      order: makeId(10),
      shortLink: false,
      type: 'draft',
      tags: [],
      posts: state.integrations.map((i) => ({
        settings: {
          __type: i.providerIdentifier,
          title: '',
          tags: [],
          subreddit: [],
        },
        group: makeId(10),
        integration: { id: i.id },
        value: [
          {
            id: makeId(10),
            content:
              state.description.replace(/\n/g, '\n\n') +
              '\n\n' +
              state.load.url,
            image: !state.image
              ? []
              : [
                  {
                    id: makeId(10),
                    name: makeId(10),
                    path: state.image,
                    organizationId: state.integrations[0].organizationId,
                  },
                ],
          },
        ],
      })),
    });
  }

  async updateUrl(state) {
    await this.autopostsRepository.updateUrl(state.id, state.load.url);
  }

  async startAutopost(id) {
    const getPost = await this.autopostsRepository.getAutopost(id);
    if (!getPost || !getPost.active) {
      return;
    }
    const load = await this.loadXML(getPost.url);
    if (!load.success || load.url === getPost.lastUrl) {
      return;
    }
    const integrations = await this.integrationService.getIntegrationsList(
      getPost.organizationId
    );
    const parseIntegrations = JSON.parse(getPost.integrations || '[]') || [];
    const neededIntegrations = integrations.filter((i) =>
      parseIntegrations.some((ii) => ii.id === i.id)
    );
    const integrationsToSend =
      parseIntegrations.length === 0 ? integrations : neededIntegrations;
    if (integrationsToSend.length === 0) {
      return;
    }
    const state = AutopostService.state();
    const workflow = state
      .addNode('generate-description', this.generateDescription.bind(this))
      .addNode('generate-picture', this.generatePicture.bind(this))
      .addNode('schedule-post', this.schedulePost.bind(this))
      .addNode('update-url', this.updateUrl.bind(this))
      .addEdge(START, 'generate-description')
      .addConditionalEdges(
        'generate-description',
        (state) => {
          if (!state.description) {
            return 'schedule-post';
          }
          if (state.body.addPicture) {
            return 'generate-picture';
          }
          return 'schedule-post';
        }
      )
      .addEdge('generate-picture', 'schedule-post')
      .addEdge('schedule-post', 'update-url')
      .addEdge('update-url', END);
    const app = workflow.compile();
    await app.invoke({
      messages: [],
      id,
      body: getPost,
      load,
      integrations: integrationsToSend,
    });
  }
}

module.exports = AutopostService;
