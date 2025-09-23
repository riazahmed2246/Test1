import SocialMediaAgency from '../../models/socialMediaAgency.model';
import SocialMediaAgencyNiche from '../../models/socialMediaAgencyNiche.model';

export class AgenciesRepository {
  async getAllAgencies() {
    return SocialMediaAgency.find({ deletedAt: null, approved: true })
      .populate('logo')
      .populate('niches')
      .sort({ createdAt: -1 });
  }

  async getCount() {
    return SocialMediaAgency.countDocuments({ deletedAt: null, approved: true });
  }

  async getAllAgenciesSlug() {
    return SocialMediaAgency.find({ deletedAt: null, approved: true }, 'slug');
  }

  async approveOrDecline(action: string, id: string) {
    return SocialMediaAgency.findByIdAndUpdate(id, { approved: action === 'approve' });
  }

  async getAgencyById(id: string) {
    return SocialMediaAgency.findOne({ id, deletedAt: null, approved: true })
      .populate('logo')
      .populate('niches')
      .populate('user');
  }

  async getAgencyInformation(slug: string) {
    return SocialMediaAgency.findOne({ slug, deletedAt: null, approved: true })
      .populate('logo')
      .populate('niches');
  }

  async getAgencyByUser(userId: string) {
    return SocialMediaAgency.findOne({ userId, deletedAt: null })
      .populate('logo')
      .populate('niches');
  }

  async createAgency(userId: string, body: typeof SocialMediaAgency.schema.obj) {
    let agency = await SocialMediaAgency.findOne({ userId });
    if (agency) {
      agency.set({
        userId,
        name: body.name,
        website: body.website,
        facebook: body.facebook,
        instagram: body.instagram,
        twitter: body.twitter,
        linkedIn: body.linkedIn,
        youtube: body.youtube,
        tiktok: body.tiktok,
        logoId: body.logo.id,
        shortDescription: body.shortDescription,
        description: body.description,
        approved: false,
      });
      await agency.save();
    } else {
      agency = await SocialMediaAgency.create({
        userId,
        name: body.name,
        website: body.website,
        facebook: body.facebook,
        instagram: body.instagram,
        twitter: body.twitter,
        linkedIn: body.linkedIn,
        youtube: body.youtube,
        tiktok: body.tiktok,
        logoId: body.logo.id,
        shortDescription: body.shortDescription,
        description: body.description,
        slug: body.name.toLowerCase().replace(/ /g, '-'),
        approved: false,
      });
    }
    // Remove niches not in body.niches
    await SocialMediaAgencyNiche.deleteMany({
      agencyId: agency.id,
      niche: { $nin: body.niches },
    });
    // Get current niches
    const currentNiche = await SocialMediaAgencyNiche.find({ agencyId: agency.id });
    const addNewNiche = body.niches.filter(
      (n) => !currentNiche.some((c) => c.niche === n)
    );
    // Add new niches
    await SocialMediaAgencyNiche.insertMany(
      addNewNiche.map((n) => ({ agencyId: agency.id, niche: n }))
    );
    return agency;
  }
}
