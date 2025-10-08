import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmDonationDto {
  @IsNotEmpty()
  @IsString()
  transactionId: string;
}