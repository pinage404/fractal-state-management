import { VNode } from '@cycle/dom';
import { Reducer, StateSource } from '@cycle/state';
import { HistoryAction } from 'cyclic-router';
import xs, { Stream } from 'xstream';
import { Component, Sinks as BaseSinks, Sources as BaseSources } from '../../../../interfaces';
import { Batch } from '../../Batch';
import { makeBatchListComponent, Sinks as BatchListSinks, Sources as BatchListSources } from '../../Batch/BatchList';
import { BatchWithMeasure } from '../../Batch/BatchList/BatchListItem';
import { Product } from '../Product';
import { intent } from './intent';
import { makeBatchListChildState, reducer } from './state';
import { view } from './view';

export type State = {
  product: Product;
  batches: Batch[];
};
export type Sources = BaseSources<State>;
export type Sinks = BaseSinks<State>;

export function ProductDetail(sources: Sources): Sinks {
  const { DOM, state } = sources;
  const product$: Stream<Product> = extractProductFromState(state.stream);
  const { updateNameAction$, updateMeasureAction$ } = intent(DOM);
  const batchListSinks = mountBatchList(sources);
  return {
    state: reducer(updateNameAction$, updateMeasureAction$, batchListSinks.state!),
    DOM: view(product$, batchListSinks.DOM!),
    router: batchListSinks.router
  };
}

function extractProductFromState(state: Stream<State>): Stream<Product> {
  return state.map(({ product }: State) => product);
}

function mountBatchList(sources: Sources): BatchListSinks {
  const state$: Stream<State> = sources.state.stream;
  const batchesWithMeasure$: Stream<BatchWithMeasure[]> = state$.map(makeBatchListChildState);

  const BatchList$: Stream<Component<BatchWithMeasure[]>> = state$.map(({ product: { id, measure } }: State) =>
    makeBatchListComponent(id, measure)
  );

  const batchListSources: BatchListSources = {
    ...sources,
    state: new StateSource(batchesWithMeasure$, '')
  };

  const batchListSinks$: Stream<BatchListSinks> = BatchList$.map(
    invokeBatchListComponentWithSources(batchListSources)
  ).fold(accumulateSinks, makeEmptyBatchListSinks());

  const { batchListStateSinks$, batchListDomSinks$, batchListRouterSinks$ } = splitSinksFromBatchListSinks(
    batchListSinks$
  );

  return {
    state: batchListStateSinks$,
    DOM: batchListDomSinks$,
    router: batchListRouterSinks$
  };
}

function invokeBatchListComponentWithSources(
  sources: BatchListSources
): (BatchList: Component<BatchWithMeasure[]>) => BatchListSinks {
  return function(BatchList: Component<BatchWithMeasure[]>): BatchListSinks {
    return BatchList(sources);
  };
}

function accumulateSinks(accumulatedSinks: BatchListSinks, currentSinks: BatchListSinks): BatchListSinks {
  return {
    state: xs.merge(accumulatedSinks.state!, currentSinks.state!),
    DOM: xs.merge(accumulatedSinks.DOM!, currentSinks.DOM!),
    router: xs.merge(accumulatedSinks.router!, currentSinks.router!)
  };
}

function makeEmptyBatchListSinks(): BatchListSinks {
  return {
    state: xs.never(),
    DOM: xs.never(),
    router: xs.never()
  };
}

function splitSinksFromBatchListSinks(
  batchListSinks$: Stream<BatchListSinks>
): {
  batchListStateSinks$: Stream<Reducer<BatchWithMeasure[]>>;
  batchListDomSinks$: Stream<VNode>;
  batchListRouterSinks$: Stream<HistoryAction>;
} {
  const batchListStateSinks$: Stream<Reducer<BatchWithMeasure[]>> = batchListSinks$
    .map(({ state }: BatchListSinks) => state!)
    .flatten();
  const batchListDomSinks$: Stream<VNode> = batchListSinks$.map(({ DOM }: BatchListSinks) => DOM!).flatten();
  const batchListRouterSinks$: Stream<HistoryAction> = batchListSinks$
    .map(({ router }: BatchListSinks) => router!)
    .flatten();
  return {
    batchListStateSinks$,
    batchListDomSinks$,
    batchListRouterSinks$
  };
}
