import { render } from '@testing-library/vue';
import { useCalendar, CalendarCell } from './index';
import { createCalendar, fromDate } from '@internationalized/date';
import { page } from 'vitest/browser';
import { expectNoA11yViolations } from '@test-utils/index';

async function click(target: ReturnType<typeof page.getByText> | ReturnType<typeof page.getByTestId>) {
  (await target.element()).click();
}

async function keyDown(target: ReturnType<typeof page.getByTestId>, code: string) {
  (await target.element()).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code }));
}

async function keyDownEl(
  target: ReturnType<typeof page.getByText> | ReturnType<typeof page.getByTestId>,
  code: string,
) {
  (await target.element()).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code }));
}

describe('useCalendar', () => {
  describe('date selection', () => {
    test('calls onUpdateModelValue when a date is selected', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      const vm = render({
        components: {
          CalendarCell,
        },
        setup() {
          const { calendarProps } = useCalendar({
            label: 'Calendar',
            timeZone: 'UTC',
            modelValue: currentDate.toDate(),
          });

          return {
            calendarProps,
            currentDate,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="calendarProps">
              <CalendarCell label="Select Date" type="day" :value="currentDate" />
            </div>
          </div>
        `,
      });

      await click(page.getByText('Select Date'));
      await expect.poll(() => vm.emitted('update:modelValue')?.[0]).toEqual([currentDate.toDate()]);
    });

    test('uses provided calendar type', async () => {
      const calendar = createCalendar('islamic-umalqura');

      render({
        setup() {
          const { selectedDate } = useCalendar({
            label: 'Calendar',
            calendar,
          });

          return {
            selectedDate,
          };
        },
        template: `
          <div data-testid="fixture">
            <div>{{ selectedDate.calendar.identifier }}</div>
          </div>
        `,
      });

      await expect.element(page.getByText('islamic-umalqura')).toBeInTheDocument();
    });

    test('handles Enter key on calendar cell', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      const vm = render({
        components: {
          CalendarCell,
        },
        setup() {
          const { calendarProps, focusedDate } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            calendarProps,
            focusedDate,
            currentDate,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="calendarProps">
              <CalendarCell
                label="Select Date"
                type="day"
                :value="currentDate"
                data-testid="calendar-cell"
              />
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      // Test Enter key selects the date
      await keyDownEl(page.getByTestId('calendar-cell'), 'Enter');
      await expect.poll(() => vm.emitted('update:modelValue')?.[0]).toEqual([currentDate.toDate()]);
    });

    test('handles Enter key in different panels', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      const vm = render({
        setup() {
          const { calendarProps, focusedDate, gridLabelProps, currentView } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            calendarProps,
            focusedDate,
            gridLabelProps,
            currentView,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="gridLabelProps" data-testid="panel-label">{{ currentView.type }}</div>
            <div v-bind="calendarProps" data-testid="calendar">
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      const calendar = page.getByTestId('calendar');
      const panelLabel = page.getByTestId('panel-label');
      await keyDown(calendar, 'Escape');

      // Test Enter in day panel
      await keyDown(calendar, 'Enter');
      await expect.poll(() => vm.emitted('update:modelValue')?.[0]).toEqual([currentDate.toDate()]);

      // Switch to month panel
      await click(panelLabel);
      await keyDown(calendar, 'Enter');
      await expect.element(page.getByTestId('panel-label')).toHaveTextContent('weeks'); // Should switch back to day panel

      // Switch to year panel
      await click(panelLabel);
      await click(panelLabel);
      await keyDown(calendar, 'Enter');
      await expect.element(page.getByTestId('panel-label')).toHaveTextContent('months'); // Should switch back to month panel
    });
  });

  describe('panel navigation', () => {
    test('switches between day, month, and year panels', async () => {
      render({
        setup() {
          const { gridLabelProps, currentView } = useCalendar({ label: 'Calendar' });

          return {
            gridLabelProps,
            currentView,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="gridLabelProps" data-testid="panel-label">{{ currentView.type }}</div>
          </div>
        `,
      });

      const panelLabel = page.getByTestId('panel-label');
      await expect.element(panelLabel).toHaveTextContent('weeks');

      await click(panelLabel);
      await expect.element(panelLabel).toHaveTextContent('months');

      await click(panelLabel);
      await expect.element(panelLabel).toHaveTextContent('years');
    });

    test('navigates to next/previous panels', async () => {
      render({
        setup() {
          const { nextButtonProps, previousButtonProps, currentView } = useCalendar({
            label: 'Calendar',
          });

          return {
            nextButtonProps,
            previousButtonProps,
            currentView,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="previousButtonProps">Previous</button>
            <div data-testid="panel-type">{{ currentView.type }}</div>
            <button v-bind="nextButtonProps">Next</button>
          </div>
        `,
      });

      await expect.element(page.getByTestId('panel-type')).toHaveTextContent('weeks');

      // Test navigation buttons
      await click(page.getByText('Next'));
      await click(page.getByText('Previous'));
    });

    test('navigates months using next/previous buttons in month panel', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      render({
        setup() {
          const { nextButtonProps, previousButtonProps, gridLabelProps, focusedDate, calendarProps } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            nextButtonProps,
            previousButtonProps,
            gridLabelProps,
            focusedDate,
            calendarProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="calendarProps">
              <div v-bind="gridLabelProps" data-testid="panel-label">Month Panel</div>
              <button v-bind="previousButtonProps">Previous</button>
              <button v-bind="nextButtonProps">Next</button>
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      const panelLabel = page.getByTestId('panel-label');

      // Switch to month panel
      await click(panelLabel);

      // Test next button (next year in month panel)
      await click(page.getByText('Next'));
      await expect.element(page.getByText(currentDate.add({ years: 1 }).toString())).toBeInTheDocument();

      // Test previous button (previous year in month panel)
      await click(page.getByText('Previous'));
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Test multiple clicks
      await click(page.getByText('Previous'));
      await click(page.getByText('Previous'));
      await expect.element(page.getByText(currentDate.subtract({ years: 2 }).toString())).toBeInTheDocument();

      await click(page.getByText('Next'));
      await expect.element(page.getByText(currentDate.subtract({ years: 1 }).toString())).toBeInTheDocument();
    });

    test('navigates years using next/previous buttons in year panel', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      render({
        setup() {
          const { nextButtonProps, previousButtonProps, gridLabelProps, focusedDate, calendarProps } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            nextButtonProps,
            previousButtonProps,
            gridLabelProps,
            focusedDate,
            calendarProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="calendarProps">
              <div v-bind="gridLabelProps" data-testid="panel-label">Year Panel</div>
              <button v-bind="previousButtonProps">Previous</button>
              <button v-bind="nextButtonProps">Next</button>
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      const panelLabel = page.getByTestId('panel-label');

      // Switch to month panel then year panel
      await click(panelLabel);
      await click(panelLabel);

      // Test next button (next set of years)
      await click(page.getByText('Next'));
      await expect
        .element(
          page.getByText(
            currentDate
              .add({ years: 9 })
              .set({ month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })
              .toString(),
          ),
        )
        .toBeInTheDocument();

      // Test previous button (previous set of years)
      await click(page.getByText('Previous'));
      await expect
        .element(
          page.getByText(
            currentDate
              .add({ years: 8 })
              .set({ month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })
              .toString(),
          ),
        )
        .toBeInTheDocument();

      // Test multiple clicks
      await click(page.getByText('Previous'));
      await click(page.getByText('Previous'));
      await expect
        .element(
          page.getByText(
            currentDate
              .subtract({ years: 10 })
              .set({ month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })
              .toString(),
          ),
        )
        .toBeInTheDocument();

      await click(page.getByText('Next'));
      await expect
        .element(
          page.getByText(
            currentDate
              .subtract({ years: 9 })
              .set({ month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })
              .toString(),
          ),
        )
        .toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    test('handles arrow key navigation in day panel', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      render({
        setup() {
          const { calendarProps, selectedDate, focusedDate } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            calendarProps,
            selectedDate,
            focusedDate,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="calendarProps" data-testid="calendar">
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      const calendar = page.getByTestId('calendar');

      // Test right arrow (next day)
      await keyDown(calendar, 'ArrowRight');
      await expect.element(page.getByText(currentDate.add({ days: 1 }).toString())).toBeInTheDocument();

      // Test left arrow (previous day)
      await keyDown(calendar, 'ArrowLeft');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Test down arrow (next week)
      await keyDown(calendar, 'ArrowDown');
      await expect.element(page.getByText(currentDate.add({ weeks: 1 }).toString())).toBeInTheDocument();

      // Test up arrow (previous week)
      await keyDown(calendar, 'ArrowUp');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Test PageUp (previous month)
      await keyDown(calendar, 'PageUp');
      await expect.element(page.getByText(currentDate.subtract({ months: 1 }).toString())).toBeInTheDocument();

      // Test PageDown (next month)
      await keyDown(calendar, 'PageDown');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Test Home (start of month)
      await keyDown(calendar, 'Home');
      await expect.element(page.getByText(currentDate.set({ day: 1 }).toString())).toBeInTheDocument();

      // Test End (end of month)
      await keyDown(calendar, 'End');
      await expect
        .element(page.getByText(currentDate.set({ day: currentDate.calendar.getDaysInMonth(currentDate) }).toString()))
        .toBeInTheDocument();
    });

    test('handles arrow key navigation in month panel', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      render({
        setup() {
          const { calendarProps, selectedDate, focusedDate, gridLabelProps } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            calendarProps,
            selectedDate,
            focusedDate,
            gridLabelProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="calendarProps" data-testid="calendar">
              <div v-bind="gridLabelProps" data-testid="panel-label">Month Panel</div>
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      const calendar = page.getByTestId('calendar');
      const panelLabel = page.getByTestId('panel-label');

      // Switch to month panel
      await click(panelLabel);

      // Test right arrow (next month)
      await keyDown(calendar, 'ArrowRight');
      await expect.element(page.getByText(currentDate.add({ months: 1 }).toString())).toBeInTheDocument();

      // Test left arrow (previous month)
      await keyDown(calendar, 'ArrowLeft');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Test down arrow (3 months forward)
      await keyDown(calendar, 'ArrowDown');
      await expect.element(page.getByText(currentDate.add({ months: 3 }).toString())).toBeInTheDocument();

      // Test up arrow (3 months back)
      await keyDown(calendar, 'ArrowUp');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Test PageUp (previous year)
      await keyDown(calendar, 'PageUp');
      await expect.element(page.getByText(currentDate.subtract({ years: 1 }).toString())).toBeInTheDocument();

      // Test PageDown (next year)
      await keyDown(calendar, 'PageDown');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Test Home (start of year)
      await keyDown(calendar, 'Home');
      await expect.element(page.getByText(currentDate.set({ month: 1 }).toString())).toBeInTheDocument();

      // Test End (end of year)
      await keyDown(calendar, 'End');
      await expect
        .element(
          page.getByText(currentDate.set({ month: currentDate.calendar.getMonthsInYear(currentDate) }).toString()),
        )
        .toBeInTheDocument();
    });

    test('handles arrow key navigation in year panel', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      render({
        setup() {
          const { calendarProps, selectedDate, focusedDate, gridLabelProps } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            calendarProps,
            selectedDate,
            focusedDate,
            gridLabelProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="calendarProps" data-testid="calendar">
              <div v-bind="gridLabelProps" data-testid="panel-label">Year Panel</div>
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      const calendar = page.getByTestId('calendar');
      const panelLabel = page.getByTestId('panel-label');

      // Switch to month panel then year panel
      await click(panelLabel);
      await click(panelLabel);

      // Test right arrow (next year)
      await keyDown(calendar, 'ArrowRight');
      await expect.element(page.getByText(currentDate.add({ years: 1 }).toString())).toBeInTheDocument();

      // Test left arrow (previous year)
      await keyDown(calendar, 'ArrowLeft');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Test down arrow (3 years forward)
      await keyDown(calendar, 'ArrowDown');
      await expect.element(page.getByText(currentDate.add({ years: 3 }).toString())).toBeInTheDocument();

      // Test up arrow (3 years back)
      await keyDown(calendar, 'ArrowUp');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Test PageUp (previous set of years)
      await keyDown(calendar, 'PageUp');
      await expect.element(page.getByText(currentDate.subtract({ years: 9 }).toString())).toBeInTheDocument();

      // Test PageDown (next set of years)
      await keyDown(calendar, 'PageDown');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Test Home (start of year set)
      await keyDown(calendar, 'Home');
      await expect.element(page.getByText(currentDate.subtract({ years: 9 }).toString())).toBeInTheDocument();

      // Test End (end of year set)
      await keyDown(calendar, 'End');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();
    });

    test('respects min and max date boundaries', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');
      const minDate = currentDate.subtract({ days: 1 });
      const maxDate = currentDate.add({ days: 1 });

      render({
        setup() {
          const { calendarProps, selectedDate, focusedDate } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
            min: minDate.toDate(),
            max: maxDate.toDate(),
          });

          return {
            calendarProps,
            selectedDate,
            focusedDate,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="calendarProps" data-testid="calendar">
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      const calendar = page.getByTestId('calendar');

      // Try to go before min date
      await keyDown(calendar, 'ArrowLeft');
      await expect.element(page.getByText(minDate.toString())).toBeInTheDocument();

      // Try to go after max date
      await keyDown(calendar, 'ArrowRight');
      await keyDown(calendar, 'ArrowRight');
      await expect.element(page.getByText(maxDate.toString())).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    test('prevents all interactions when disabled', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      render({
        components: {
          CalendarCell,
        },
        setup() {
          const { calendarProps, gridLabelProps, nextButtonProps, previousButtonProps, focusedDate, currentView } =
            useCalendar({
              label: 'Calendar',
              modelValue: currentDate.toDate(),
              timeZone: 'UTC',
              disabled: true,
            });

          return {
            calendarProps,
            gridLabelProps,
            nextButtonProps,
            previousButtonProps,
            focusedDate,
            currentView,
            currentDate,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="calendarProps" data-testid="calendar">
              <div v-bind="gridLabelProps" data-testid="panel-label">{{ currentView.type }}</div>
              <button v-bind="previousButtonProps">Previous</button>
              <button v-bind="nextButtonProps">Next</button>
              <CalendarCell
                label="Select Date"
                type="day"
                :value="currentDate"
                data-testid="calendar-cell"
              />
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      // Verify navigation buttons are disabled
      await expect.element(page.getByText('Previous')).toBeDisabled();
      await expect.element(page.getByText('Next')).toBeDisabled();

      // Try to click navigation buttons
      await click(page.getByText('Previous'));
      await click(page.getByText('Next'));
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Try to change panel view
      await click(page.getByTestId('panel-label'));
      await expect.element(page.getByTestId('panel-label')).toHaveTextContent('weeks');

      // Try keyboard navigation
      const calendar = page.getByTestId('calendar');
      await keyDown(calendar, 'ArrowRight');
      await keyDown(calendar, 'ArrowLeft');
      await keyDown(calendar, 'ArrowUp');
      await keyDown(calendar, 'ArrowDown');
      await keyDown(calendar, 'PageUp');
      await keyDown(calendar, 'PageDown');
      await keyDown(calendar, 'Home');
      await keyDown(calendar, 'End');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Try to select a date
      const cell = page.getByTestId('calendar-cell');
      await click(cell);
      await keyDownEl(cell, 'Enter');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();
    });
  });

  describe('readonly state', () => {
    test('prevents all interactions when readonly', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      render({
        components: {
          CalendarCell,
        },
        setup() {
          const { calendarProps, gridLabelProps, nextButtonProps, previousButtonProps, focusedDate, currentView } =
            useCalendar({
              label: 'Calendar',
              modelValue: currentDate.toDate(),
              timeZone: 'UTC',
              readonly: true,
            });

          return {
            calendarProps,
            gridLabelProps,
            nextButtonProps,
            previousButtonProps,
            focusedDate,
            currentView,
            currentDate,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="calendarProps" data-testid="calendar">
              <div v-bind="gridLabelProps" data-testid="panel-label">{{ currentView.type }}</div>
              <button v-bind="previousButtonProps">Previous</button>
              <button v-bind="nextButtonProps">Next</button>
              <CalendarCell
                label="Select Date"
                type="day"
                :value="currentDate"
                data-testid="calendar-cell"
              />
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      // Verify navigation buttons are disabled
      await expect.element(page.getByText('Previous')).toBeDisabled();
      await expect.element(page.getByText('Next')).toBeDisabled();

      // Try to click navigation buttons
      await click(page.getByText('Previous'));
      await click(page.getByText('Next'));
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Try to change panel view
      await click(page.getByTestId('panel-label'));
      await expect.element(page.getByTestId('panel-label')).toHaveTextContent('weeks');

      // Try keyboard navigation
      const calendar = page.getByTestId('calendar');
      await keyDown(calendar, 'ArrowRight');
      await keyDown(calendar, 'ArrowLeft');
      await keyDown(calendar, 'ArrowUp');
      await keyDown(calendar, 'ArrowDown');
      await keyDown(calendar, 'PageUp');
      await keyDown(calendar, 'PageDown');
      await keyDown(calendar, 'Home');
      await keyDown(calendar, 'End');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();

      // Try to select a date
      const cell = page.getByTestId('calendar-cell');
      await click(cell);
      await keyDownEl(cell, 'Enter');
      await expect.element(page.getByText(currentDate.toString())).toBeInTheDocument();
    });
  });

  describe('a11y', () => {
    test('calendar should not have accessibility violations', async () => {
      render({
        setup() {
          const { calendarProps, gridProps, gridLabelProps, nextButtonProps, previousButtonProps } = useCalendar({
            label: 'Calendar',
          });

          return {
            calendarProps,
            gridProps,
            gridLabelProps,
            nextButtonProps,
            previousButtonProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="calendarProps">
              <div v-bind="gridLabelProps">Month Year</div>
              <button v-bind="previousButtonProps">Previous</button>
              <button v-bind="nextButtonProps">Next</button>
              <div v-bind="gridProps">
                <!-- Calendar grid content would go here -->
              </div>
            </div>
          </div>
        `,
      });

      await expectNoA11yViolations('[data-testid="fixture"]');
    });
  });
});
