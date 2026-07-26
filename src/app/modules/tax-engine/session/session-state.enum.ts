export enum TaxSessionStep {
  awaiting_query = 'awaiting_query',
  searching = 'searching',
  computing = 'computing',
  processing = 'processing',
  results_displayed = 'results_displayed',
  terminated = 'terminated',
}

export const VALID_TRANSITIONS: Record<TaxSessionStep, TaxSessionStep[]> = {
  [TaxSessionStep.awaiting_query]: [
    TaxSessionStep.searching,
    TaxSessionStep.computing,
    TaxSessionStep.processing,
    TaxSessionStep.terminated,
  ],
  [TaxSessionStep.searching]: [
    TaxSessionStep.results_displayed,
    TaxSessionStep.processing,
    TaxSessionStep.terminated,
  ],
  [TaxSessionStep.computing]: [
    TaxSessionStep.results_displayed,
    TaxSessionStep.terminated,
  ],
  [TaxSessionStep.processing]: [
    TaxSessionStep.results_displayed,
    TaxSessionStep.terminated,
  ],
  [TaxSessionStep.results_displayed]: [
    TaxSessionStep.awaiting_query,
    TaxSessionStep.terminated,
  ],
  [TaxSessionStep.terminated]: [],
};
