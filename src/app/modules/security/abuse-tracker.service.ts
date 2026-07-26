import { Injectable } from '@nestjs/common';
@Injectable()
export class AbuseTrackerService {
  async track(): Promise<void> {}
}
