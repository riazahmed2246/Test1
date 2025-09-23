const StarsRepository = require('./stars.repository');
const NotificationService = require('../notifications/notification.service');
const dayjs = require('dayjs');
const chunk = require('lodash/chunk');
const groupBy = require('lodash/groupBy');
const mean = require('simple-statistics').mean;

const Inform = {
  Removed: 0,
  New: 1,
  Changed: 2,
};

class StarsService {
  constructor(starsRepository, notificationsService, workerServiceProducer) {
    this._starsRepository = starsRepository;
    this._notificationsService = notificationsService;
    this._workerServiceProducer = workerServiceProducer;
  }

  getGitHubRepositoriesByOrgId(org) {
    return this._starsRepository.getGitHubRepositoriesByOrgId(org);
  }

  getAllGitHubRepositories() {
    return this._starsRepository.getAllGitHubRepositories();
  }

  getStarsByLogin(login) {
    return this._starsRepository.getStarsByLogin(login);
  }

  getLastStarsByLogin(login) {
    return this._starsRepository.getLastStarsByLogin(login);
  }

  createStars(login, totalNewsStars, totalStars, totalNewForks, totalForks, date) {
    return this._starsRepository.createStars(login, totalNewsStars, totalStars, totalNewForks, totalForks, date);
  }

  async sync(login, token) {
    const loadAllStars = await this.syncProcess(login, token);
    const loadAllForks = await this.syncForksProcess(login, token);

    const allDates = [
      ...new Set([...Object.keys(loadAllStars), ...Object.keys(loadAllForks)]),
    ];

    const sortedArray = allDates.sort(
      (a, b) => dayjs(a).unix() - dayjs(b).unix()
    );

    let addPreviousStars = 0;
    let addPreviousForks = 0;
    for (const date of sortedArray) {
      const dateObject = dayjs(date).toDate();
      addPreviousStars += loadAllStars[date] || 0;
      addPreviousForks += loadAllForks[date] || 0;

      await this._starsRepository.createStars(
        login,
        loadAllStars[date] || 0,
        addPreviousStars,
        loadAllForks[date] || 0,
        addPreviousForks,
        dateObject
      );
    }
  }

  async findValidToken(login) {
    return this._starsRepository.findValidToken(login);
  }

  async fetchWillFallback(url, userToken) {
    if (userToken) {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github.v3.star+json',
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (response.status === 200) {
        return response;
      }
    }

    const response2 = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3.star+json',
        ...(process.env.GITHUB_AUTH
          ? { Authorization: `token ${process.env.GITHUB_AUTH}` }
          : {}),
      },
    });

    const totalRemaining = +(
      response2.headers.get('x-ratelimit-remaining') ||
      response2.headers.get('X-RateLimit-Remaining') ||
      0
    );
    const resetTime = +(
      response2.headers.get('x-ratelimit-reset') ||
      response2.headers.get('X-RateLimit-Reset') ||
      0
    );

    if (totalRemaining < 10) {
      console.log('waiting for the rate limit');
      const delay = resetTime * 1000 - Date.now() + 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.fetchWillFallback(url, userToken);
    }

    return response2;
  }

  async syncForksProcess(login, userToken, page = 1) {
    console.log('processing forks');
    const starsRequest = await this.fetchWillFallback(
      `https://api.github.com/repos/${login}/forks?page=${page}&per_page=100`,
      userToken
    );

    const data = await starsRequest.json();
    const mapDataToDate = groupBy(data, (p) =>
      dayjs(p.created_at).format('YYYY-MM-DD')
    );

    // take all the forks from the page
    const aggForks = Object.values(
      mapDataToDate
    ).reduce(
      (acc, value) => ({
        ...acc,
        [dayjs(value[0].created_at).format('YYYY-MM-DD')]: value.length,
      }),
      {}
    );

    // if we have 100 stars, we need to fetch the next page and merge the results (recursively)
    const nextOne =
      data.length === 100
        ? await this.syncForksProcess(login, userToken, page + 1)
        : {};

    // merge the results
    const allKeys = [
      ...new Set([...Object.keys(aggForks), ...Object.keys(nextOne)]),
    ];

    return {
      ...allKeys.reduce(
        (acc, key) => ({
          ...acc,
          [key]: (aggForks[key] || 0) + (nextOne[key] || 0),
        }),
        {}
      ),
    };
  }

  async syncProcess(login, userToken, page = 1) {
    console.log('processing stars');
    const starsRequest = await this.fetchWillFallback(
      `https://api.github.com/repos/${login}/stargazers?page=${page}&per_page=100`,
      userToken
    );

    const data = await starsRequest.json();
    const mapDataToDate = groupBy(data, (p) =>
      dayjs(p.starred_at).format('YYYY-MM-DD')
    );

    // take all the stars from the page
    const aggStars = Object.values(
      mapDataToDate
    ).reduce(
      (acc, value) => ({
        ...acc,
        [dayjs(value[0].starred_at).format('YYYY-MM-DD')]: value.length,
      }),
      {}
    );

    // if we have 100 stars, we need to fetch the next page and merge the results (recursively)
    const nextOne =
      data.length === 100
        ? await this.syncProcess(login, userToken, page + 1)
        : {};

    // merge the results
    const allKeys = [
      ...new Set([...Object.keys(aggStars), ...Object.keys(nextOne)]),
    ];

    return {
      ...allKeys.reduce(
        (acc, key) => ({
          ...acc,
          [key]: (aggStars[key] || 0) + (nextOne[key] || 0),
        }),
        {}
      ),
    };
  }

  async updateTrending(
    language,
    hash,
    arr
  ) {
    const currentTrending = await this._starsRepository.getTrendingByLanguage(
      language
    );

    if (currentTrending?.hash === hash) {
      return;
    }

    if (currentTrending) {
      const list = JSON.parse(currentTrending.trendingList);
      const removedFromTrending = list.filter(
        (p) => !arr.find((a) => a.name === p.name)
      );
      const changedPosition = arr.filter((p) => {
        const current = list.find((a) => a.name === p.name);
        return current && current.position !== p.position;
      });
      if (removedFromTrending.length) {
        // let people know they are not trending anymore
        await this.inform(Inform.Removed, removedFromTrending, language);
      }
      if (changedPosition.length) {
        // let people know they changed position
        await this.inform(Inform.Changed, changedPosition, language);
      }
    }

    const informNewPeople = arr.filter(
      (p) =>
        !currentTrending?.trendingList ||
        currentTrending?.trendingList?.indexOf(p.name) === -1
    );

    // let people know they are trending
    await this.inform(Inform.New, informNewPeople, language);
    await this.replaceOrAddTrending(language, hash, arr);
  }

  async inform(
    type,
    removedFromTrending,
    language
  ) {
    const names = await this._starsRepository.getGitHubsByNames(
      removedFromTrending.map((p) => p.name)
    );
    const mapDbNamesToList = names.map(
      (n) => removedFromTrending.find((p) => p.name === n.login)!
    );
    for (const person of mapDbNamesToList) {
      const getOrganizationsByGitHubLogin =
        await this._starsRepository.getOrganizationsByGitHubLogin(person.name);
      for (const org of getOrganizationsByGitHubLogin) {
        switch (type) {
          case Inform.Removed:
            return this._notificationsService.inAppNotification(
              org.organizationId,
              `${person.name} is not trending on GitHub anymore`,
              `${person.name} is not trending anymore in ${language}`,
              true
            );
          case Inform.New:
            return this._notificationsService.inAppNotification(
              org.organizationId,
              `${person.name} is trending on GitHub`,
              `${person.name} is trending in ${
                language || 'On the main feed'
              } position #${person.position}`,
              true
            );
          case Inform.Changed:
            return this._notificationsService.inAppNotification(
              org.organizationId,
              `${person.name} changed trending position on GitHub`,
              `${person.name} changed position in ${
                language || 'on the main feed to position'
              } position #${person.position}`,
              true
            );
        }
      }
    }
  }

  async replaceOrAddTrending(
    language,
    hash,
    arr
  ) {
    return this._starsRepository.replaceOrAddTrending(language, hash, arr);
  }

  async getStars(org) {
    const getGitHubs = await this.getGitHubRepositoriesByOrgId(org);
    const list = [];
    for (const gitHub of getGitHubs) {
      if (!gitHub.login) {
        continue;
      }
      const getAllByLogin = await this.getStarsByLogin(gitHub.login!);

      const stars = getAllByLogin.filter((f) => f.stars);
      const graphSize = stars.length < 10 ? stars.length : stars.length / 10;

      const forks = getAllByLogin.filter((f) => f.forks);
      const graphForkSize =
        forks.length < 10 ? forks.length : forks.length / 10;

      list.push({
        login: gitHub.login,
        stars: chunk(stars, graphSize).reduce((acc, chunkedStars) => {
          return [
            ...acc,
            {
              totalStars: chunkedStars[chunkedStars.length - 1].totalStars,
              date: chunkedStars[chunkedStars.length - 1].date,
            },
          ];
        }, []),
        forks: chunk(forks, graphForkSize).reduce((acc, chunkedForks) => {
          return [
            ...acc,
            {
              totalForks: chunkedForks[chunkedForks.length - 1].totalForks,
              date: chunkedForks[chunkedForks.length - 1].date,
            },
          ];
        }, []),
      });
    }

    return list;
  }

  async getStarsFilter(orgId, starsFilter) {
    const getGitHubs = await this.getGitHubRepositoriesByOrgId(orgId);
    if (getGitHubs.filter((f) => f.login).length === 0) {
      return [];
    }
    return this._starsRepository.getStarsFilter(
      getGitHubs.map((p) => p.login),
      starsFilter
    );
  }

  async addGitHub(orgId, code) {
    const { access_token } = await (
      await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${process.env.FRONTEND_URL}/settings`,
        }),
      })
    ).json();

    return this._starsRepository.addGitHub(orgId, access_token);
  }

  async getOrganizations(orgId, id) {
    const getGitHub = await this._starsRepository.getGitHubById(orgId, id);
    return (
      await fetch(`https://api.github.com/user/orgs`, {
        headers: {
          Authorization: `token ${getGitHub?.token!}`,
        },
      })
    ).json();
  }

  async getRepositoriesOfOrganization(
    orgId,
    id,
    github
  ) {
    const getGitHub = await this._starsRepository.getGitHubById(orgId, id);
    return (
      await fetch(`https://api.github.com/orgs/${github}/repos`, {
        headers: {
          Authorization: `token ${getGitHub?.token!}`,
        },
      })
    ).json();
  }

  async updateGitHubLogin(orgId, id, login) {
    const check = await fetch(`https://github.com/${login}`);
    if (check.status === 404) {
      throw new Error('GitHub repository not found!');
    }

    this._workerServiceProducer
      .emit('sync_all_stars', { payload: { login } })
      .subscribe();
    return this._starsRepository.updateGitHubLogin(orgId, id, login);
  }

  async deleteRepository(orgId, id) {
    return this._starsRepository.deleteRepository(orgId, id);
  }

  async predictTrending(max = 500) {
    const firstDate = dayjs().subtract(1, 'day');
    return [
      firstDate.format('YYYY-MM-DDT12:00:00'),
      ...[...new Array(max)].map((p, index) => {
        return firstDate.add(index, 'day').format('YYYY-MM-DDT12:00:00');
      }),
    ];
  }

  async predictTrendingLoop(
    trendings,
    current = 0,
    max = 500
  ) {
    const dates = trendings.map((result) => dayjs(result.date).toDate());
    const intervals = dates
      .slice(1)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      .map((date, i) => (date - dates[i]) / (1000 * 60 * 60 * 24));
    const nextInterval = intervals.length === 0 ? null : mean(intervals);
    const lastTrendingDate = dates[dates.length - 1];
    const nextTrendingDate = !nextInterval
      ? false
      : dayjs(
          new Date(
            lastTrendingDate.getTime() + nextInterval * 24 * 60 * 60 * 1000
          )
        ).toDate();

    if (!nextTrendingDate) {
      return [];
    }

    return [
      nextTrendingDate,
      ...(current < max
        ? await this.predictTrendingLoop(
            [...trendings, { date: nextTrendingDate }],
            current + 1,
            max
          )
        : []),
    ];
  }
}

module.exports = StarsService;
