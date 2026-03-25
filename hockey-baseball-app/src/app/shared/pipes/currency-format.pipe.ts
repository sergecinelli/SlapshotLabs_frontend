import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true,
  name: 'currencyFormat',
})
export class CurrencyFormatPipe implements PipeTransform {
  private formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  transform(value: unknown, withDollar = true): string {
    let numericValue: number;

    if (typeof value === 'string') {
      const numberMatch = value.match(/-?\d[\d,]*\.?\d*/);
      numericValue = numberMatch ? Number(numberMatch[0].replace(/,/g, '')) : NaN;
    } else if (typeof value === 'number') {
      numericValue = value;
    } else {
      numericValue = Number(value);
    }

    if (Number.isNaN(numericValue)) {
      numericValue = 0;
    }

    const formatted = this.formatter.format(numericValue);
    return withDollar ? `$${formatted}` : formatted;
  }
}
