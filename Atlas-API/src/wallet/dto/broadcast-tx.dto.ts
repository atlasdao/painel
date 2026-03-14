import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class BroadcastTxDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1_048_576) // 500KB hex = ~1MB string max
  @Matches(/^[0-9a-fA-F]+$/, { message: 'txHex must be a valid hex string' })
  txHex: string;
}
