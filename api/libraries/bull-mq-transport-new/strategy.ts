import { Queue, Worker } from 'bullmq';
import { ioRedis } from '../redis/redis.service';

// The `CustomTransportStrategy` and `Server` classes are specific to NestJS's
// microservices architecture. A direct conversion is not possible as there is
// no equivalent in a standard Node.js/Express application.
//
// The functionality of this file is to create and manage BullMQ workers
// that handle jobs from the queues. In a standard Node.js application, this
// would be done by a worker script or by a part of the main application that
// is dedicated to processing jobs.

// Here is a conceptual equivalent using plain Node.js/Express.
// The `messageHandlers` would be a Map you manage yourself.

export class BullMqServer {
  queues: Map<string, Queue>;
  workers: Worker[] = [];
  private messageHandlers: Map<string, (jobData: any) => Promise<any>>;

  constructor() {
    this.messageHandlers = new Map();
    this.queues = new Map();
  }

  // This method adds a handler for a specific queue pattern.
  // It's a manual way of doing what NestJS's `@MessagePattern` decorator does.
  addHandler(pattern: string, handler: (jobData: any) => Promise<any>) {
    this.messageHandlers.set(pattern, handler);
  }

  listen() {
    this.queues = [...this.messageHandlers.keys()].reduce((all, pattern) => {
      all.set(pattern, new Queue(pattern, { connection: ioRedis }));
      return all;
    }, new Map());

    this.workers = Array.from(this.messageHandlers).map(
      ([pattern, handler]) => {
        return new Worker(
          pattern,
          async (job) => {
            // Your handler would be invoked here.
            // The logic for handling job results and failures is manual.
            try {
              const result = await handler(job.data);
              // Handle success
              // For example, mark job as complete
              return result;
            } catch (err) {
              // Handle error
              // For example, mark job as failed
              throw err;
            }
          },
          {
            maxStalledCount: 10,
            concurrency: 300,
            connection: ioRedis,
            removeOnComplete: {
              count: 0,
            },
            removeOnFail: {
              count: 0,
            },
          }
        );
      }
    );

    console.log('BullMQ workers are listening for jobs.');
  }

  close() {
    this.workers.map((worker) => worker.close());
    this.queues.forEach((queue) => queue.close());
    return true;
  }
}

// Note: This converted class doesn't handle the `send` method or `transformToObservable`
// because those are part of NestJS's microservices communication model which does not
// apply to a generic Node.js/Express application.