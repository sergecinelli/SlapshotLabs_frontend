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
        (click)="goToPreviousMonth()"
        [disabled]="isFirstWeek()"
        class="nav-button"
        [attr.aria-label]="'Previous month'"
      >
        <span class="material-symbols-rounded">chevron_left</span>
      </button>

      <div class="week-display">
        <div class="week-range">
          <span class="week-start">{{ formatMonthYear(weekStart()) }}</span>
        </div>
        <div class="calendar-wrapper">
          <button
            #calendarButton
            mat-icon-button
            (click)="openCalendar()"
            class="calendar-button"
            [attr.aria-label]="'Select month from calendar'"
          >
            <span class="material-symbols-rounded">calendar_month</span>
          </button>
          <mat-form-field class="calendar-field-hidden">
            <input
              matInput
              [matDatepicker]="picker"
              [value]="weekStart()"
              (dateChange)="onDateSelected($event)"
              [attr.aria-label]="'Select month'"
            />
            <mat-datepicker #picker xPosition="start" yPosition="below"></mat-datepicker>
          </mat-form-field>
        </div>
      </div>

      <button
        mat-icon-button
        (click)="goToNextMonth()"
        [disabled]="isLastWeek()"
        class="nav-button"
        [attr.aria-label]="'Next month'"
      >
        <span class="material-symbols-rounded">chevron_right</span>
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

  goToPreviousMonth(): void {
    const start = this.getMonthStart(this.weekStart());
    const newStart = new Date(start);
    newStart.setMonth(newStart.getMonth() - 1);
    const newEnd = this.getMonthEnd(newStart);
    this.weekChange.emit({ start: newStart, end: newEnd });
  }

  goToNextMonth(): void {
    const start = this.getMonthStart(this.weekStart());
    const newStart = new Date(start);
    newStart.setMonth(newStart.getMonth() + 1);
    const newEnd = this.getMonthEnd(newStart);
    this.weekChange.emit({ start: newStart, end: newEnd });
  }

  openCalendar(): void {
    this.picker.open();
  }

  onDateSelected(event: { value: Date | null }): void {
    if (event.value) {
      const selectedDate = new Date(event.value);
      selectedDate.setHours(0, 0, 0, 0);
      const monthStart = this.getMonthStart(selectedDate);
      const monthEnd = this.getMonthEnd(monthStart);
      this.weekChange.emit({ start: monthStart, end: monthEnd });
    }
  }

  formatMonthYear(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  private getMonthStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d;
  }

  private getMonthEnd(monthStart: Date): Date {
    const end = new Date(monthStart);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return end;
  }
}

