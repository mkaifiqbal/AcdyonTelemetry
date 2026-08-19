export class IngestionError extends Error {
  constructor(message, type = 'UNKNOWN') { super(message); this.name = 'IngestionError'; this.type = type; }
}
