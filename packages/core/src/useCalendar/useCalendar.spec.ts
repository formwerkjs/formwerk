import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { useCalendar, CalendarCell } from './index';
import { flush } from '@test-utils/flush';
import { Temporal } from 'temporal-polyfill';

describe('useCalendar', () => {
  describe('a11y', () => {
    test('calendar should not have accessibility violations', async () => {
      await render({
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

      await flush();
      vi.useRealTimers();
      expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
      vi.useFakeTimers();
    });
  });

  describe('date selection', () => {
    test('calls onUpdateModelValue when a date is selected', async () => {
      const currentDate = Temporal.ZonedDateTime.from({
        year: 2025,
        month: 3,
        day: 11,
        timeZone: 'UTC',
      });

      const vm = await render({
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

      await flush();
      await fireEvent.click(screen.getByText('Select Date'));
      await flush();
      expect(vm.emitted('update:modelValue')[0]).toEqual([currentDate.toDate()]);
    });

    test('uses provided calendar type', async () => {
      const calendar = createCalendar('islamic-umalqura');

      await render({
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

      await flush();
      expect(screen.getByText('islamic-umalqura')).toBeInTheDocument();
    });

    test('handles Enter key on calendar cell', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      const vm = await render({
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

      await flush();
      const cell = screen.getByTestId('calendar-cell');

      // Test Enter key selects the date
      await fireEvent.keyDown(cell, { code: 'Enter' });
      expect(vm.emitted('update:modelValue')[0]).toEqual([currentDate.toDate()]);
    });

    test('handles Enter key in different panels', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      const vm = await render({
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

      await flush();
      const calendar = screen.getByTestId('calendar');
      const panelLabel = screen.getByTestId('panel-label');
      await fireEvent.keyDown(calendar, { code: 'Escape' });

      // Test Enter in day panel
      await fireEvent.keyDown(calendar, { code: 'Enter' });
      expect(vm.emitted('update:modelValue')[0]).toEqual([currentDate.toDate()]);

      // Switch to month panel
      await fireEvent.click(panelLabel);
      await fireEvent.keyDown(calendar, { code: 'Enter' });
      expect(screen.getByTestId('panel-label')).toHaveTextContent('weeks'); // Should switch back to day panel

      // Switch to year panel
      await fireEvent.click(panelLabel);
      await fireEvent.click(panelLabel);
      await fireEvent.keyDown(calendar, { code: 'Enter' });
      expect(screen.getByTestId('panel-label')).toHaveTextContent('months'); // Should switch back to month panel
    });
  });

  describe('panel navigation', () => {
    test('switches between day, month, and year panels', async () => {
      await render({
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

      await flush();
      const panelLabel = screen.getByTestId('panel-label');
      expect(panelLabel).toHaveTextContent('weeks');

      await fireEvent.click(panelLabel);
      expect(panelLabel).toHaveTextContent('months');

      await fireEvent.click(panelLabel);
      expect(panelLabel).toHaveTextContent('years');
    });

    test('navigates to next/previous panels', async () => {
      await render({
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

      await flush();
      expect(screen.getByTestId('panel-type')).toHaveTextContent('weeks');

      // Test navigation buttons
      await fireEvent.click(screen.getByText('Next'));
      await fireEvent.click(screen.getByText('Previous'));
    });

    test('navigates months using next/previous buttons in month panel', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      await render({
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

      await flush();
      const panelLabel = screen.getByTestId('panel-label');

      // Switch to month panel
      await fireEvent.click(panelLabel);

      // Test next button (next year in month panel)
      await fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText(currentDate.add({ years: 1 }).toString())).toBeInTheDocument();

      // Test previous button (previous year in month panel)
      await fireEvent.click(screen.getByText('Previous'));
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Test multiple clicks
      await fireEvent.click(screen.getByText('Previous'));
      await fireEvent.click(screen.getByText('Previous'));
      expect(screen.getByText(currentDate.subtract({ years: 2 }).toString())).toBeInTheDocument();

      await fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText(currentDate.subtract({ years: 1 }).toString())).toBeInTheDocument();
    });

    test('navigates years using next/previous buttons in year panel', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      await render({
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

      await flush();
      const panelLabel = screen.getByTestId('panel-label');

      // Switch to month panel then year panel
      await fireEvent.click(panelLabel);
      await fireEvent.click(panelLabel);

      // Test next button (next set of years)
      await fireEvent.click(screen.getByText('Next'));
      expect(
        screen.getByText(
          currentDate
            .add({ years: 9 })
            .set({ month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toString(),
        ),
      ).toBeInTheDocument();

      // Test previous button (previous set of years)
      await fireEvent.click(screen.getByText('Previous'));
      expect(
        screen.getByText(
          currentDate
            .add({ years: 8 })
            .set({ month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toString(),
        ),
      ).toBeInTheDocument();

      // Test multiple clicks
      await fireEvent.click(screen.getByText('Previous'));
      await fireEvent.click(screen.getByText('Previous'));
      expect(
        screen.getByText(
          currentDate
            .subtract({ years: 10 })
            .set({ month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toString(),
        ),
      ).toBeInTheDocument();

      await fireEvent.click(screen.getByText('Next'));
      expect(
        screen.getByText(
          currentDate
            .subtract({ years: 9 })
            .set({ month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toString(),
        ),
      ).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    test('handles arrow key navigation in day panel', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      await render({
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

      await flush();
      const calendar = screen.getByTestId('calendar');

      // Test right arrow (next day)
      await fireEvent.keyDown(calendar, { code: 'ArrowRight' });
      expect(screen.getByText(currentDate.add({ days: 1 }).toString())).toBeInTheDocument();

      // Test left arrow (previous day)
      await fireEvent.keyDown(calendar, { code: 'ArrowLeft' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Test down arrow (next week)
      await fireEvent.keyDown(calendar, { code: 'ArrowDown' });
      expect(screen.getByText(currentDate.add({ weeks: 1 }).toString())).toBeInTheDocument();

      // Test up arrow (previous week)
      await fireEvent.keyDown(calendar, { code: 'ArrowUp' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Test PageUp (previous month)
      await fireEvent.keyDown(calendar, { code: 'PageUp' });
      expect(screen.getByText(currentDate.subtract({ months: 1 }).toString())).toBeInTheDocument();

      // Test PageDown (next month)
      await fireEvent.keyDown(calendar, { code: 'PageDown' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Test Home (start of month)
      await fireEvent.keyDown(calendar, { code: 'Home' });
      expect(screen.getByText(currentDate.set({ day: 1 }).toString())).toBeInTheDocument();

      // Test End (end of month)
      await fireEvent.keyDown(calendar, { code: 'End' });
      expect(
        screen.getByText(currentDate.set({ day: currentDate.calendar.getDaysInMonth(currentDate) }).toString()),
      ).toBeInTheDocument();
    });

    test('handles arrow key navigation in month panel', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      await render({
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

      await flush();
      const calendar = screen.getByTestId('calendar');
      const panelLabel = screen.getByTestId('panel-label');

      // Switch to month panel
      await fireEvent.click(panelLabel);

      // Test right arrow (next month)
      await fireEvent.keyDown(calendar, { code: 'ArrowRight' });
      expect(screen.getByText(currentDate.add({ months: 1 }).toString())).toBeInTheDocument();

      // Test left arrow (previous month)
      await fireEvent.keyDown(calendar, { code: 'ArrowLeft' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Test down arrow (3 months forward)
      await fireEvent.keyDown(calendar, { code: 'ArrowDown' });
      expect(screen.getByText(currentDate.add({ months: 3 }).toString())).toBeInTheDocument();

      // Test up arrow (3 months back)
      await fireEvent.keyDown(calendar, { code: 'ArrowUp' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Test PageUp (previous year)
      await fireEvent.keyDown(calendar, { code: 'PageUp' });
      expect(screen.getByText(currentDate.subtract({ years: 1 }).toString())).toBeInTheDocument();

      // Test PageDown (next year)
      await fireEvent.keyDown(calendar, { code: 'PageDown' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Test Home (start of year)
      await fireEvent.keyDown(calendar, { code: 'Home' });
      expect(screen.getByText(currentDate.set({ month: 1 }).toString())).toBeInTheDocument();

      // Test End (end of year)
      await fireEvent.keyDown(calendar, { code: 'End' });
      expect(
        screen.getByText(currentDate.set({ month: currentDate.calendar.getMonthsInYear(currentDate) }).toString()),
      ).toBeInTheDocument();
    });

    test('handles arrow key navigation in year panel', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      await render({
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

      await flush();
      const calendar = screen.getByTestId('calendar');
      const panelLabel = screen.getByTestId('panel-label');

      // Switch to month panel then year panel
      await fireEvent.click(panelLabel);
      await fireEvent.click(panelLabel);

      // Test right arrow (next year)
      await fireEvent.keyDown(calendar, { code: 'ArrowRight' });
      expect(screen.getByText(currentDate.add({ years: 1 }).toString())).toBeInTheDocument();

      // Test left arrow (previous year)
      await fireEvent.keyDown(calendar, { code: 'ArrowLeft' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Test down arrow (3 years forward)
      await fireEvent.keyDown(calendar, { code: 'ArrowDown' });
      expect(screen.getByText(currentDate.add({ years: 3 }).toString())).toBeInTheDocument();

      // Test up arrow (3 years back)
      await fireEvent.keyDown(calendar, { code: 'ArrowUp' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Test PageUp (previous set of years)
      await fireEvent.keyDown(calendar, { code: 'PageUp' });
      expect(screen.getByText(currentDate.subtract({ years: 9 }).toString())).toBeInTheDocument();

      // Test PageDown (next set of years)
      await fireEvent.keyDown(calendar, { code: 'PageDown' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Test Home (start of year set)
      await fireEvent.keyDown(calendar, { code: 'Home' });
      expect(screen.getByText(currentDate.subtract({ years: 9 }).toString())).toBeInTheDocument();

      // Test End (end of year set)
      await fireEvent.keyDown(calendar, { code: 'End' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();
    });

    test('respects min and max date boundaries', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');
      const minDate = currentDate.subtract({ days: 1 });
      const maxDate = currentDate.add({ days: 1 });

      await render({
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

      await flush();
      const calendar = screen.getByTestId('calendar');

      // Try to go before min date
      await fireEvent.keyDown(calendar, { code: 'ArrowLeft' });
      expect(screen.getByText(minDate.toString())).toBeInTheDocument();

      // Try to go after max date
      await fireEvent.keyDown(calendar, { code: 'ArrowRight' });
      await fireEvent.keyDown(calendar, { code: 'ArrowRight' });
      expect(screen.getByText(maxDate.toString())).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    test('prevents all interactions when disabled', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      await render({
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

      await flush();

      // Verify navigation buttons are disabled
      expect(screen.getByText('Previous')).toBeDisabled();
      expect(screen.getByText('Next')).toBeDisabled();

      // Try to click navigation buttons
      await fireEvent.click(screen.getByText('Previous'));
      await fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Try to change panel view
      await fireEvent.click(screen.getByTestId('panel-label'));
      expect(screen.getByTestId('panel-label')).toHaveTextContent('weeks');

      // Try keyboard navigation
      const calendar = screen.getByTestId('calendar');
      await fireEvent.keyDown(calendar, { code: 'ArrowRight' });
      await fireEvent.keyDown(calendar, { code: 'ArrowLeft' });
      await fireEvent.keyDown(calendar, { code: 'ArrowUp' });
      await fireEvent.keyDown(calendar, { code: 'ArrowDown' });
      await fireEvent.keyDown(calendar, { code: 'PageUp' });
      await fireEvent.keyDown(calendar, { code: 'PageDown' });
      await fireEvent.keyDown(calendar, { code: 'Home' });
      await fireEvent.keyDown(calendar, { code: 'End' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Try to select a date
      const cell = screen.getByTestId('calendar-cell');
      await fireEvent.click(cell);
      await fireEvent.keyDown(cell, { code: 'Enter' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();
    });
  });

  describe('readonly state', () => {
    test('prevents all interactions when readonly', async () => {
      const currentDate = fromDate(new Date(2025, 2, 11), 'UTC');

      await render({
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

      await flush();

      // Verify navigation buttons are disabled
      expect(screen.getByText('Previous')).toBeDisabled();
      expect(screen.getByText('Next')).toBeDisabled();

      // Try to click navigation buttons
      await fireEvent.click(screen.getByText('Previous'));
      await fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Try to change panel view
      await fireEvent.click(screen.getByTestId('panel-label'));
      expect(screen.getByTestId('panel-label')).toHaveTextContent('weeks');

      // Try keyboard navigation
      const calendar = screen.getByTestId('calendar');
      await fireEvent.keyDown(calendar, { code: 'ArrowRight' });
      await fireEvent.keyDown(calendar, { code: 'ArrowLeft' });
      await fireEvent.keyDown(calendar, { code: 'ArrowUp' });
      await fireEvent.keyDown(calendar, { code: 'ArrowDown' });
      await fireEvent.keyDown(calendar, { code: 'PageUp' });
      await fireEvent.keyDown(calendar, { code: 'PageDown' });
      await fireEvent.keyDown(calendar, { code: 'Home' });
      await fireEvent.keyDown(calendar, { code: 'End' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();

      // Try to select a date
      const cell = screen.getByTestId('calendar-cell');
      await fireEvent.click(cell);
      await fireEvent.keyDown(cell, { code: 'Enter' });
      expect(screen.getByText(currentDate.toString())).toBeInTheDocument();
    });
  });
});
