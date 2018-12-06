import { Component } from '../../../../interfaces';
import {
  makeListComponent,
  Sinks as ListSinks,
  Sources as ListSources,
  State as ListState
} from '../../../shared/List';
import { Measure } from '../../Product';
import { createBatch } from '../Batch';
import { BatchListItem, BatchWithMeasure } from './BatchListItem';

export type State = ListState<BatchWithMeasure>;
export type Sources = ListSources<BatchWithMeasure>;
export type Sinks = ListSinks<BatchWithMeasure>;

export function makeBatchListComponent(productId: string, measure: Measure): Component<BatchWithMeasure[]> {
  return makeListComponent<BatchWithMeasure>('batch', BatchListItem, createBatchWithMeasure(productId, measure));
}

function createBatchWithMeasure(productId: string, measure: Measure): () => BatchWithMeasure {
  return () => ({
    ...createBatch(productId),
    measure
  });
}
