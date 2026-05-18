export class CreateInterestRateDto {
  profile_name!: string;
  calculation_method!: string;
  base_rate!: number;
  penalty_rate!: number;
  
  // Standard Corporate Compounding Options
  compounding_frequency!: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Semi-Annually' | 'Annually' | 'None';
  
  status?: string; // Optional properties don't need the exclamation mark
  lender_id!: string;
}