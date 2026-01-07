import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEditStaff } from './add-edit-staff';

describe('AddEditStaff', () => {
  let component: AddEditStaff;
  let fixture: ComponentFixture<AddEditStaff>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddEditStaff]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddEditStaff);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
