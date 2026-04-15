import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  /** Summary: This field captures the user's email address for account registration. */
  @IsEmail()
  email!: string;

  /** Summary: This field captures the user's plaintext password during registration. */
  @IsString()
  @MinLength(6)
  password!: string;
}