import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { useCalendar, CalendarCell } from './index';
import { flush } from '@test-utils/flush';
import { createCalendar, now } from '@internationalized/date';

describe('useCalendar', () => {
  describe('a11y', () => {
    test('calendar should not have accessibility violations', async () => {
      await render({
        setup() {
          const { calendarProps, gridProps, buttonProps, gridLabelProps, nextButtonProps, previousButtonProps } =
            useCalendar({ label: 'Calendar' });

          return {
            calendarProps,
            gridProps,
            buttonProps,
            gridLabelProps,
            nextButtonProps,
            previousButtonProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <div v-bind="calendarProps">
              <button v-bind="buttonProps">Open Calendar</button>
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

  describe('calendar controls', () => {
    test('opens calendar when button is clicked', async () => {
      await render({
        setup() {
          const { buttonProps, isOpen } = useCalendar({ label: 'Calendar' });

          return {
            buttonProps,
            isOpen,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-if="isOpen">Calendar Content</div>
          </div>
        `,
      });

      await flush();
      expect(screen.queryByText('Calendar Content')).not.toBeInTheDocument();
      await fireEvent.click(screen.getByText('Open Calendar'));
      expect(screen.getByText('Calendar Content')).toBeInTheDocument();
    });

    test('closes calendar when Escape is pressed', async () => {
      await render({
        setup() {
          const { calendarProps, isOpen, buttonProps } = useCalendar({ label: 'Calendar' });

          return {
            calendarProps,
            isOpen,
            buttonProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-if="isOpen" v-bind="calendarProps">Calendar Content</div>
          </div>
        `,
      });

      await flush();
      await fireEvent.click(screen.getByText('Open Calendar'));
      expect(screen.getByText('Calendar Content')).toBeInTheDocument();
      await fireEvent.keyDown(screen.getByText('Calendar Content'), { code: 'Escape' });
      expect(screen.queryByText('Calendar Content')).not.toBeInTheDocument();
    });

    test('closes calendar when Tab is pressed', async () => {
      await render({
        setup() {
          const { calendarProps, isOpen, buttonProps, gridProps } = useCalendar({ label: 'Calendar' });

          return {
            calendarProps,
            isOpen,
            buttonProps,
            gridProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-if="isOpen" v-bind="calendarProps">
              <span v-bind="gridProps" tabindex="0">Calendar Content</span>
            </div>
          </div>
        `,
      });

      await flush();
      await fireEvent.click(screen.getByText('Open Calendar'));
      expect(screen.getByText('Calendar Content')).toBeInTheDocument();
      await fireEvent.keyDown(screen.getByText('Calendar Content'), { code: 'Tab' });
      expect(screen.queryByText('Calendar Content')).not.toBeInTheDocument();
    });
  });

  describe('date selection', () => {
    test('calls onUpdateModelValue when a date is selected', async () => {
      const currentDate = now('UTC');

      const vm = await render({
        components: {
          CalendarCell,
        },
        setup() {
          const { calendarProps, buttonProps } = useCalendar({
            label: 'Calendar',
            timeZone: 'UTC',
            modelValue: currentDate.toDate(),
          });

          return {
            calendarProps,
            buttonProps,
            currentDate,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
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
      const currentDate = now('UTC');

      const vm = await render({
        components: {
          CalendarCell,
        },
        setup() {
          const { calendarProps, buttonProps, isOpen, focusedDate } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            calendarProps,
            buttonProps,
            isOpen,
            focusedDate,
            currentDate,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-if="isOpen" v-bind="calendarProps">
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
      await fireEvent.click(screen.getByText('Open Calendar'));
      const cell = screen.getByTestId('calendar-cell');

      // Test Enter key selects the date
      await fireEvent.keyDown(cell, { code: 'Enter' });
      expect(vm.emitted('update:modelValue')[0]).toEqual([currentDate.toDate()]);
      expect(screen.queryByText(currentDate.toString())).not.toBeInTheDocument(); // Calendar should close after selection
    });

    test('handles Enter key in different panels', async () => {
      const currentDate = now('UTC');

      const vm = await render({
        setup() {
          const { calendarProps, buttonProps, isOpen, focusedDate, gridLabelProps, currentView } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            calendarProps,
            buttonProps,
            isOpen,
            focusedDate,
            gridLabelProps,
            currentView,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-bind="gridLabelProps" data-testid="panel-label">{{ currentView.type }}</div>
            <div v-if="isOpen" v-bind="calendarProps" data-testid="calendar">
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      await flush();
      await fireEvent.click(screen.getByText('Open Calendar'));
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
      const currentDate = now('UTC');

      await render({
        setup() {
          const {
            nextButtonProps,
            previousButtonProps,
            gridLabelProps,
            focusedDate,
            calendarProps,
            isOpen,
            buttonProps,
          } = useCalendar({
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
            isOpen,
            buttonProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-if="isOpen" v-bind="calendarProps">
              <div v-bind="gridLabelProps" data-testid="panel-label">Month Panel</div>
              <button v-bind="previousButtonProps">Previous</button>
              <button v-bind="nextButtonProps">Next</button>
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      await flush();
      await fireEvent.click(screen.getByText('Open Calendar'));
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
      const currentDate = now('UTC');

      await render({
        setup() {
          const {
            nextButtonProps,
            previousButtonProps,
            gridLabelProps,
            focusedDate,
            calendarProps,
            isOpen,
            buttonProps,
          } = useCalendar({
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
            isOpen,
            buttonProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-if="isOpen" v-bind="calendarProps">
              <div v-bind="gridLabelProps" data-testid="panel-label">Year Panel</div>
              <button v-bind="previousButtonProps">Previous</button>
              <button v-bind="nextButtonProps">Next</button>
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      await flush();
      await fireEvent.click(screen.getByText('Open Calendar'));
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
      const currentDate = now('UTC');

      await render({
        setup() {
          const { calendarProps, isOpen, buttonProps, selectedDate, focusedDate } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            calendarProps,
            isOpen,
            buttonProps,
            selectedDate,
            focusedDate,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-if="isOpen" v-bind="calendarProps" data-testid="calendar">
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      await flush();
      await fireEvent.click(screen.getByText('Open Calendar'));
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
      const currentDate = now('UTC');

      await render({
        setup() {
          const { calendarProps, isOpen, buttonProps, selectedDate, focusedDate, gridLabelProps } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            calendarProps,
            isOpen,
            buttonProps,
            selectedDate,
            focusedDate,
            gridLabelProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-if="isOpen" v-bind="calendarProps" data-testid="calendar">
              <div v-bind="gridLabelProps" data-testid="panel-label">Month Panel</div>
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      await flush();
      await fireEvent.click(screen.getByText('Open Calendar'));
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
      const currentDate = now('UTC');

      await render({
        setup() {
          const { calendarProps, isOpen, buttonProps, selectedDate, focusedDate, gridLabelProps } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            calendarProps,
            isOpen,
            buttonProps,
            selectedDate,
            focusedDate,
            gridLabelProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-if="isOpen" v-bind="calendarProps" data-testid="calendar">
              <div v-bind="gridLabelProps" data-testid="panel-label">Year Panel</div>
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      await flush();
      await fireEvent.click(screen.getByText('Open Calendar'));
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
      const currentDate = now('UTC');
      const minDate = currentDate.subtract({ days: 1 });
      const maxDate = currentDate.add({ days: 1 });

      await render({
        setup() {
          const { calendarProps, isOpen, buttonProps, selectedDate, focusedDate } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
            min: minDate.toDate(),
            max: maxDate.toDate(),
          });

          return {
            calendarProps,
            isOpen,
            buttonProps,
            selectedDate,
            focusedDate,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-if="isOpen" v-bind="calendarProps" data-testid="calendar">
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      await flush();
      await fireEvent.click(screen.getByText('Open Calendar'));
      const calendar = screen.getByTestId('calendar');

      // Try to go before min date
      await fireEvent.keyDown(calendar, { code: 'ArrowLeft' });
      expect(screen.getByText(minDate.toString())).toBeInTheDocument();

      // Try to go after max date
      await fireEvent.keyDown(calendar, { code: 'ArrowRight' });
      await fireEvent.keyDown(calendar, { code: 'ArrowRight' });
      expect(screen.getByText(maxDate.toString())).toBeInTheDocument();
    });

    test('handles double-press Home and End keys in day panel', async () => {
      const currentDate = now('UTC');

      await render({
        setup() {
          const { calendarProps, isOpen, buttonProps, focusedDate } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            calendarProps,
            isOpen,
            buttonProps,
            focusedDate,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-if="isOpen" v-bind="calendarProps" data-testid="calendar">
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      await flush();
      await fireEvent.click(screen.getByText('Open Calendar'));
      const calendar = screen.getByTestId('calendar');

      // Test Home key (first press - start of current month)
      await fireEvent.keyDown(calendar, { code: 'Home' });
      expect(screen.getByText(currentDate.set({ day: 1 }).toString())).toBeInTheDocument();

      // Test Home key (second press - start of previous month)
      await fireEvent.keyDown(calendar, { code: 'Home' });
      expect(screen.getByText(currentDate.subtract({ months: 1 }).set({ day: 1 }).toString())).toBeInTheDocument();

      // Reset to current date
      await fireEvent.keyDown(calendar, { code: 'Escape' });
      await fireEvent.click(screen.getByText('Open Calendar'));

      // Test End key (first press - end of current month)
      await fireEvent.keyDown(calendar, { code: 'End' });
      expect(
        screen.getByText(currentDate.set({ day: currentDate.calendar.getDaysInMonth(currentDate) }).toString()),
      ).toBeInTheDocument();

      // Test End key (second press - start of next month)
      await fireEvent.keyDown(calendar, { code: 'End' });
      expect(screen.getByText(currentDate.add({ months: 1 }).set({ day: 1 }).toString())).toBeInTheDocument();
    });

    test('handles double-press Home month panel', async () => {
      const currentDate = now('UTC');

      await render({
        setup() {
          const { calendarProps, isOpen, buttonProps, focusedDate, gridLabelProps } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            calendarProps,
            isOpen,
            buttonProps,
            focusedDate,
            gridLabelProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-if="isOpen" v-bind="calendarProps" data-testid="calendar">
              <div v-bind="gridLabelProps" data-testid="panel-label">Month Panel</div>
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      await flush();
      await fireEvent.click(screen.getByText('Open Calendar'));
      const calendar = screen.getByTestId('calendar');
      const panelLabel = screen.getByTestId('panel-label');

      // Switch to month panel
      await fireEvent.click(panelLabel);

      // Test Home key (first press - start of current year)
      await fireEvent.keyDown(calendar, { code: 'Home' });
      expect(screen.getByText(currentDate.set({ month: 1 }).toString())).toBeInTheDocument();

      // Test Home key (second press - start of previous year)
      await fireEvent.keyDown(calendar, { code: 'Home' });
      expect(screen.getByText(currentDate.subtract({ years: 1 }).set({ month: 1 }).toString())).toBeInTheDocument();
    });

    test('handles double-press End month panel', async () => {
      const currentDate = now('UTC');

      await render({
        setup() {
          const { calendarProps, isOpen, buttonProps, focusedDate, gridLabelProps } = useCalendar({
            label: 'Calendar',
            modelValue: currentDate.toDate(),
            timeZone: 'UTC',
          });

          return {
            calendarProps,
            isOpen,
            buttonProps,
            focusedDate,
            gridLabelProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <button v-bind="buttonProps">Open Calendar</button>
            <div v-if="isOpen" v-bind="calendarProps" data-testid="calendar">
              <div v-bind="gridLabelProps" data-testid="panel-label">Month Panel</div>
              <div>{{ focusedDate?.toString() }}</div>
            </div>
          </div>
        `,
      });

      await flush();
      await fireEvent.click(screen.getByText('Open Calendar'));
      const calendar = screen.getByTestId('calendar');
      const panelLabel = screen.getByTestId('panel-label');

      // Switch to month panel
      await fireEvent.click(panelLabel);

      // Test End key (first press - end of current year)
      await fireEvent.keyDown(calendar, { code: 'End' });
      expect(
        screen.getByText(currentDate.set({ month: currentDate.calendar.getMonthsInYear(currentDate) }).toString()),
      ).toBeInTheDocument();

      // Test End key (second press - start of next year)
      await fireEvent.keyDown(calendar, { code: 'End' });
      expect(screen.getByText(currentDate.add({ years: 1 }).set({ month: 1 }).toString())).toBeInTheDocument();
    });
  });
});
