import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldComponent {
  label = input<string>();
  required = input(false);
  error = input('');
  readonly = input(false);
  readonlyValue = input('');
}
