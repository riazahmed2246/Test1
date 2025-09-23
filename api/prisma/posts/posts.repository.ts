const PostModel = require('../../models/post.model');
const PopularPostsModel = require('../../models/popularPosts.model');
const CommentsModel = require('../../models/comments.model');
const TagsModel = require('../../models/tags.model');
const TagsPostsModel = require('../../models/tagsPosts.model');
const ErrorsModel = require('../../models/errors.model');
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');

class PostsRepository {
  checkPending15minutesBack() {
    return PostModel.find({
      publishDate: {
        $lte: dayjs.utc().subtract(15, 'minute').toDate(),
        $gte: dayjs.utc().subtract(30, 'minute').toDate(),
      },
      state: 'QUEUE',
      deletedAt: null,
      parentPostId: null,
    }).select('id publishDate');
  }

  searchForMissingThreeHoursPosts() {
    return PostModel.find({
      'integration.refreshNeeded': false,
      'integration.inBetweenSteps': false,
      'integration.disabled': false,
      publishDate: {
        $gte: dayjs.utc().toDate(),
        $lt: dayjs.utc().add(3, 'hour').toDate(),
      },
      state: 'QUEUE',
      deletedAt: null,
      parentPostId: null,
    }).select('id publishDate');
  }

  getOldPosts(orgId, date) {
    return PostModel.find({
      'integration.refreshNeeded': false,
      'integration.inBetweenSteps': false,
      'integration.disabled': false,
      organizationId: orgId,
      publishDate: {
        $lte: dayjs(date).toDate(),
      },
      deletedAt: null,
      parentPostId: null,
    })
      .sort({ publishDate: 'desc' })
      .select(
        'id content publishDate releaseURL state integration'
      );
  }

  updateImages(id, images) {
    return PostModel.findByIdAndUpdate(id, {
      image: images,
    });
  }

  getPostUrls(orgId, ids) {
    return PostModel.find({
      organizationId: orgId,
      id: {
        $in: ids,
      },
    }).select('id releaseURL');
  }

  async getPosts(orgId, query) {
    const startDate = dayjs.utc(query.startDate).toDate();
    const endDate = dayjs.utc(query.endDate).toDate();
    const filter = {
      $and: [
        {
          $or: [
            { organizationId: orgId },
            { submittedForOrganizationId: orgId },
          ],
        },
        {
          $or: [
            { publishDate: { $gte: startDate, $lte: endDate } },
            { intervalInDays: { $ne: null } },
          ],
        },
      ],
      deletedAt: null,
      parentPostId: null,
      ...(query.customer ? { 'integration.customerId': query.customer } : {}),
    };
    const list = await PostModel.find(filter)
      .select(
        'id content publishDate releaseURL submittedForOrganizationId submittedForOrderId state intervalInDays group tags integration'
      )
      .populate('tags integration');

    return list.reduce((all, post) => {
      if (!post.intervalInDays) {
        return [...all, post];
      }

      const addMorePosts = [];
      let startingDate = dayjs.utc(post.publishDate);
      while (dayjs.utc(endDate).isSameOrAfter(startingDate)) {
        if (dayjs(startingDate).isSameOrAfter(dayjs.utc(post.publishDate))) {
          addMorePosts.push({
            ...post,
            publishDate: startingDate.toDate(),
            actualDate: post.publishDate,
          });
        }

        startingDate = startingDate.add(post.intervalInDays, 'days');
      }

      return [...all, ...addMorePosts];
    }, []); // Return the modified list
  }

  async deletePost(orgId, group) {
    await PostModel.updateMany(
      {
        organizationId: orgId,
        group,
      },
      {
        deletedAt: new Date(),
      }
    );

    return PostModel.findOne({
      organizationId: orgId,
      group,
      parentPostId: null,
    }).select('id');
  }

  getPost(id, includeIntegration = false, orgId, isFirst) {
    return PostModel.findOne({
      id,
      ...(orgId ? { organizationId: orgId } : {}),
      deletedAt: null,
    })
      .populate(
        includeIntegration
          ? {
              path: 'integration',
            }
          : {}
      )
      .populate('childrenPost');
  }

  updatePost(id, postId, releaseURL) {
    return PostModel.findByIdAndUpdate(id, {
      state: 'PUBLISHED',
      releaseURL,
      releaseId: postId,
    });
  }

  async changeState(id, state, err, body) {
    const update = await PostModel.findByIdAndUpdate(
      id,
      {
        state,
        ...(err
          ? { error: typeof err === 'string' ? err : JSON.stringify(err) }
          : {}),
      },
      {
        new: true,
        populate: {
          path: 'integration',
          select: {
            providerIdentifier: true,
          },
        },
      }
    );

    if (state === 'ERROR' && err && body) {
      try {
        await ErrorsModel.create({
          message: typeof err === 'string' ? err : JSON.stringify(err),
          organizationId: update.organizationId,
          platform: update.integration.providerIdentifier,
          postId: update.id,
          body: typeof body === 'string' ? body : JSON.stringify(body),
        });
      } catch (err) {}
    }

    return update;
  }

  async changeDate(orgId, id, date) {
    return PostModel.findOneAndUpdate(
      {
        organizationId: orgId,
        id,
      },
      {
        publishDate: dayjs(date).toDate(),
      }
    );
  }

  countPostsFromDay(orgId, date) {
    return PostModel.countDocuments({
      organizationId: orgId,
      publishDate: {
        $gte: date,
      },
      $or: [
        {
          deletedAt: null,
          state: {
            $in: ['QUEUE'],
          },
        },
        {
          state: 'PUBLISHED',
        },
      ],
    });
  }

  async createOrUpdatePost(
    state,
    orgId,
    date,
    body,
    tags,
    inter
  ) {
    const posts = [];
    const uuid = uuidv4();

    for (const value of body.value) {
      const updateData = (type) => ({
        publishDate: dayjs(date).toDate(),
        integration: {
          id: body.integration.id,
          organizationId: orgId,
        },
        ...(posts?.[posts.length - 1]?.id
          ? {
              parentPost: {
                id: posts[posts.length - 1]?.id,
              },
            }
          : type === 'update'
          ? {
              parentPost: {
                disconnect: true,
              },
            }
          : {}),
        content: value.content,
        group: uuid,
        intervalInDays: inter ? +inter : null,
        approvedSubmitForOrder: 'NO',
        state: state === 'draft' ? 'DRAFT' : 'QUEUE',
        image: JSON.stringify(value.image),
        settings: JSON.stringify(body.settings),
        organization: {
          id: orgId,
        },
      });

      posts.push(
        await PostModel.findOneAndUpdate(
          {
            id: value.id || uuidv4(),
          },
          { ...updateData('create') },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          }
        )
      );

      if (posts.length === 1) {
        await TagsPostsModel.deleteMany({
          post: {
            id: posts[0].id,
          },
        });

        if (tags.length) {
          const tagsList = await TagsModel.find({
            orgId: orgId,
            name: {
              $in: tags.map((tag) => tag.label).filter((f) => f),
            },
          });

          if (tagsList.length) {
            await PostModel.findByIdAndUpdate(posts[posts.length - 1].id, {
              $addToSet: {
                tags: {
                  $each: tagsList.map((tag) => ({
                    tagId: tag.id,
                  })),
                },
              },
            });
          }
        }
      }
    }

    const previousPost = body.group
      ? (
          await PostModel.findOne({
            group: body.group,
            deletedAt: null,
            parentPostId: null,
          }).select('id')
        )?.id
      : undefined;

    if (body.group) {
      await PostModel.updateMany({
        group: body.group,
        deletedAt: null,
      },
      {
        parentPostId: null,
        deletedAt: new Date(),
      });
    }

    return { previousPost, posts };
  }

  async submit(id, order, buyerOrganizationId) {
    return PostModel.findByIdAndUpdate(
      id,
      {
        submittedForOrderId: order,
        approvedSubmitForOrder: 'WAITING_CONFIRMATION',
        submittedForOrganizationId: buyerOrganizationId,
      },
      {
        new: true,
        select: {
          id: true,
          description: true,
          submittedForOrder: {
            select: {
              messageGroupId: true,
            },
          },
        },
      }
    );
  }

  updateMessage(id, messageId) {
    return PostModel.findByIdAndUpdate(id, {
      lastMessageId: messageId,
    });
  }

  getPostById(id, org) {
    return PostModel.findOne({
      id,
      ...(org ? { organizationId: org } : {}),
    })
      .populate('integration')
      .populate({
        path: 'submittedForOrder',
        populate: {
          path: 'posts',
          match: {
            state: 'PUBLISHED',
          },
        },
      });
  }

  findAllExistingCategories() {
    return PopularPostsModel.find().distinct('category');
  }

  findAllExistingTopicsOfCategory(category) {
    return PopularPostsModel.find({ category }).distinct('topic');
  }

  findPopularPosts(category, topic) {
    return PopularPostsModel.find({
      category,
      ...(topic ? { topic } : {}),
    }).select('content hook');
  }

  createPopularPosts(post) {
    return PopularPostsModel.create({
      category: 'category',
      topic: 'topic',
      content: 'content',
      hook: 'hook',
    });
  }

  async getPostsCountsByDates(orgId, times, date) {
    const dates = await PostModel.find({
      deletedAt: null,
      organizationId: orgId,
      publishDate: {
        $in: times.map((time) => {
          return date.clone().add(time, 'minutes').toDate();
        }),
      },
    });

    return times.filter(
      (time) =>
        date.clone().add(time, 'minutes').isAfter(dayjs.utc()) &&
        !dates.find((dateFind) => {
          return (
            dayjs
              .utc(dateFind.publishDate)
              .diff(date.clone().startOf('day'), 'minutes') == time
          );
        })
    );
  }

  async getComments(postId) {
    return CommentsModel.find({
      postId,
    }).sort({ createdAt: 'asc' });
  }

  async getTags(orgId) {
    return TagsModel.find({
      orgId,
    });
  }

  createTag(orgId, body) {
    return TagsModel.create({
      orgId,
      name: body.name,
      color: body.color,
    });
  }

  editTag(id, orgId, body) {
    return TagsModel.findByIdAndUpdate(id, {
      name: body.name,
      color: body.color,
    });
  }

  createComment(orgId, userId, postId, content) {
    return CommentsModel.create({
      organizationId: orgId,
      userId,
      postId,
      content,
    });
  }

  async getPostsSince(orgId, since) {
    return PostModel.find({
      organizationId: orgId,
      publishDate: {
        $gte: new Date(since),
      },
      deletedAt: null,
      parentPostId: null,
    }).select(
      'id content publishDate releaseURL state integration'
    );
  }
}

module.exports = PostsRepository;
