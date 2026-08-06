import { Competitor, ICompetitor } from '../../models/Competitor.js';

export class CompetitorsService {
  static async getCompetitors(): Promise<ICompetitor[]> {
    return Competitor.find().sort({ createdAt: -1 });
  }

  static async getCompetitorById(id: string): Promise<ICompetitor | null> {
    return Competitor.findById(id);
  }

  static async createCompetitor(data: Partial<ICompetitor>): Promise<ICompetitor> {
    const competitor = new Competitor(data);
    return competitor.save();
  }

  static async updateCompetitor(id: string, data: Partial<ICompetitor>): Promise<ICompetitor | null> {
    return Competitor.findByIdAndUpdate(id, data, { new: true });
  }

  static async deleteCompetitor(id: string): Promise<boolean> {
    const result = await Competitor.findByIdAndDelete(id);
    return result !== null;
  }
}
