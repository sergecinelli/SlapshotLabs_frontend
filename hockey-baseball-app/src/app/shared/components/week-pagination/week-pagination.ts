import { Component, input, output, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { MatDatepicker } from '@angular/material/datepicker';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-week-pagination',
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
  ],
  template: `
    <div class="week-pagination">
      <button
        mat-icon-button
        (click)="goToPreviousWeek()"
        [disabled]="isFirstWeek()"
        class="nav-button"
        [attr.aria-label]="'Previous week'"
      >
        <mat-icon>chevron_left</mat-icon>
      </button>

      <div class="week-display">
        <div class="week-range">
          <span class="week-start">{{ formatDateWithDay(weekStart()) }}</span>
          <span class="week-separator">-</span>
          <span class="week-end">{{ formatDateWithDay(weekEnd()) }}</span>
        </div>
        <div class="calendar-wrapper">
          <button
            #calendarButton
            mat-icon-button
            (click)="openCalendar()"
            class="calendar-button"
            [attr.aria-label]="'Select week from calendar'"
          >
            <mat-icon>calendar_month</mat-icon>
          </button>
          <mat-form-field class="calendar-field-hidden">
            <input
              matInput
              [matDatepicker]="picker"
              [value]="weekStart()"
              (dateChange)="onDateSelected($event)"
              [attr.aria-label]="'Select week'"
            />
            <mat-datepicker #picker xPosition="start" yPosition="below"></mat-datepicker>
          </mat-form-field>
        </div>
      </div>

      <button
        mat-icon-button
        (click)="goToNextWeek()"
        [disabled]="isLastWeek()"
        class="nav-button"
        [attr.aria-label]="'Next week'"
      >
        <mat-icon>chevron_right</mat-icon>
      </button>
    </div>
  `,
  styleUrl: './week-pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPaginationComponent {
  @ViewChild('picker') picker!: MatDatepicker<Date>;

  weekStart = input.required<Date>();
  weekEnd = input.required<Date>();
  weekChange = output<{ start: Date; end: Date }>();

  isFirstWeek = input<boolean>(false);
  isLastWeek = input<boolean>(false);

  goToPreviousWeek(): void {
    const start = this.weekStart();
    const newStart = new Date(start);
    newStart.setDate(newStart.getDate() - 7);
    const newEnd = this.getWeekEnd(newStart);
    this.weekChange.emit({ start: newStart, end: newEnd });
  }

  goToNextWeek(): void {
    const start = this.weekStart();
    const newStart = new Date(start);
    newStart.setDate(newStart.getDate() + 7);
    const newEnd = this.getWeekEnd(newStart);
    this.weekChange.emit({ start: newStart, end: newEnd });
  }

  openCalendar(): void {
    this.picker.open();
  }

  onDateSelected(event: { value: Date | null }): void {
    if (event.value) {
      const selectedDate = new Date(event.value);
      selectedDate.setHours(0, 0, 0, 0);
      const weekStart = this.getWeekStart(selectedDate);
      const weekEnd = this.getWeekEnd(weekStart);
      this.weekChange.emit({ start: weekStart, end: weekEnd });
    }
  }

  formatDateWithDay(date: Date): string {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${dayOfWeek}. ${month}. ${day}`;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const result = new Date(d);
    result.setDate(diff);
    return result;
  }

  private getWeekEnd(weekStart: Date): Date {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }
}

