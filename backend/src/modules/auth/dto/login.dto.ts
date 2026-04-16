import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** Summary: This field captures the user's email address for login. */
  @IsEmail()
  email!: string;

  /** Summary: This field captures the user's plaintext password for login. */
  @IsString()
  @MinLength(6)
  password!: string;
}