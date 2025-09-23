const GitHubModel = require('../../models/github.model');
const StarModel = require('../../models/star.model');
const TrendingModel = require('../../models/trending.model');

class StarsRepository {
  async getGitHubRepositoriesByOrgId(org) {
    return GitHubModel.find({ organizationId: org });
  }

  async replaceOrAddTrending(language, hashedNames, arr) {
    return TrendingModel.findOneAndUpdate(
      { language },
      {
        language,
        hash: hashedNames,
        trendingList: JSON.stringify(arr),
        date: new Date(),
      },
      { upsert: true, new: true }
    );
  }

  async getAllGitHubRepositories() {
    return GitHubModel.find().distinct('login');
  }

  async getLastStarsByLogin(login) {
    return StarModel.findOne({ login }).sort({ date: -1 });
  }

  async getStarsByLogin(login) {
    return StarModel.find({ login }).sort({ date: 1 });
  }

  async getGitHubsByNames(names) {
    return GitHubModel.find({ login: { $in: names } });
  }

  async findValidToken(login) {
    return GitHubModel.findOne({ login });
  }

  async createStars(login, totalNewsStars, totalStars, totalNewForks, totalForks, date) {
    return StarModel.findOneAndUpdate(
      { login, date },
      {
        login,
        stars: totalNewsStars,
        forks: totalNewForks,
        totalForks,
        totalStars,
        date,
      },
      { upsert: true, new: true }
    );
  }

  async getTrendingByLanguage(language) {
    return TrendingModel.findOne({ language });
  }

  async getStarsFilter(githubs, starsFilter) {
    return StarModel.find({
      login: { $in: githubs.filter((f) => f) },
    })
      .sort({ [starsFilter.key || 'date']: starsFilter.state === 'asc' ? 1 : -1 })
      .skip((starsFilter.page - 1) * 10)
      .limit(20);
  }

  async addGitHub(orgId, accessToken) {
    return GitHubModel.create({
      token: accessToken,
      organizationId: orgId,
      jobId: '',
    });
  }

  async getGitHubById(orgId, id) {
    return GitHubModel.findOne({ organizationId: orgId, _id: id });
  }

  async updateGitHubLogin(orgId, id, login) {
    return GitHubModel.findOneAndUpdate(
      { organizationId: orgId, _id: id },
      { login },
      { new: true }
    );
  }

  async deleteRepository(orgId, id) {
    return GitHubModel.deleteOne({ organizationId: orgId, _id: id });
  }

  async getOrganizationsByGitHubLogin(login) {
    return GitHubModel.find({ login }).distinct('organizationId');
  }
}

module.exports = StarsRepository;
