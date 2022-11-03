import { RoutePlanner } from '../utils/routerCommands'

// interface for entities that can be encoded as a narwhal command
export interface Command {
  encode(planner: RoutePlanner): void
}
