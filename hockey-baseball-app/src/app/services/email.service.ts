import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface EmailResponse {
  success: boolean;
  message: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class EmailService {

  /**
   * Simulates sending a password reset email
   * @param email - The email address to send the reset link to
   * @returns Observable<EmailResponse>
   */
  sendPasswordResetEmail(email: string): Observable<EmailResponse> {
    console.log(`[EMAIL SERVICE] Simulating password reset email to: ${email}`);

    // Simulate network delay (1-3 seconds)
    const randomDelay = Math.random() * 2000 + 1000; // 1-3 seconds

    // Simulate occasional failures (5% failure rate)
    const shouldFail = Math.random() < 0.05;

    if (shouldFail) {
      console.log(`[EMAIL SERVICE] Simulated failure for: ${email}`);
      return throwError(() => new Error('Network error: Unable to send email')).pipe(
        delay(randomDelay)
      );
    }

    const response: EmailResponse = {
      success: true,
      message: `Password reset email sent successfully to ${email}`,
      timestamp: new Date(),
    };

    console.log(`[EMAIL SERVICE] Email sent successfully:`, response);

    return of(response).pipe(delay(randomDelay));
  }

  /**
   * Simulates checking if an email exists in the system
   * @param email - The email address to check
   * @returns Observable<boolean>
   */
  checkEmailExists(email: string): Observable<boolean> {
    console.log(`[EMAIL SERVICE] Checking if email exists: ${email}`);

    // Simulate some common email domains as "existing" users
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domain = email.split('@')[1];
    const exists = commonDomains.includes(domain?.toLowerCase());

    return of(exists).pipe(delay(500));
  }
}
