export interface WidgetProps {
  /** Widgets report what the learner did; lessons decide whether that meets the goal. */
  onEvent: (event: string) => void
  props?: Record<string, unknown>
}
