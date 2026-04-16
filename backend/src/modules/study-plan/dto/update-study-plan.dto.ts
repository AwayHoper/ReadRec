import { IsEnum, IsInt, Max, Min } from 'class-validator';

export class UpdateStudyPlanDto {
  /** Summary: This field captures the selected active book identifier. */
  bookId!: string;

  /** Summary: This field captures the target number of daily words. */
  @IsInt()
  @Min(1)
  @Max(200)
  dailyWordCount!: number;

  /** Summary: This field captures the plan's new-word ratio numerator. */
  @IsInt()
  @Min(1)
  @Max(1)
  newWordRatio!: number;

  /** Summary: This field captures the plan's review-word ratio numerator. */
  @IsInt()
  @Min(1)
  @Max(4)
  reviewWordRatio!: number;

  /** Summary: This field captures the preferred article style for generation. */
  @IsEnum(['EXAM', 'NEWS', 'TED'])
  articleStyle!: 'EXAM' | 'NEWS' | 'TED';
}
