import { Injectable } from '@nestjs/common';
import { StatsRepository } from './stats.repository';

@Injectable()
export class StatsService {
  constructor(private readonly statsRepository: StatsRepository) {}

  getLiveStats() {
    return this.statsRepository.getLiveStats();
  }
}
