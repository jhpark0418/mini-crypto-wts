import { Inject, Injectable } from '@nestjs/common';
import { Candle } from './candle.types';
import { CandleTimeframe } from '@wts/common';

export const CANDLE_HISTORY_REPOSITORY = "CANDLE_HISTORY_REPOSITORY";

@Injectable()
export class CandlesService {
    constructor() {}
}
