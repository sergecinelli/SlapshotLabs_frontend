import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalieProfile } from './goalie-profile';

describe('GoalieProfile', () => {
  let component: GoalieProfile;
  let fixture: ComponentFixture<GoalieProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalieProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoalieProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
