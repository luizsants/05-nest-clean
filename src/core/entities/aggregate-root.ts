import { DomainEvent } from '../events/domain-event'
import { DomainEvents } from '../events/domain-events'
import { Entity } from './entity'

export abstract class AggregateRoot<Props> extends Entity<Props> {
  private _domain_events: DomainEvent[] = []
  get domainEvents(): DomainEvent[] {
    return this._domain_events
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domain_events.push(domainEvent)
    DomainEvents.markAggregateForDispatch(this)
  }

  public clearEvents() {
    this._domain_events = []
  }
}
