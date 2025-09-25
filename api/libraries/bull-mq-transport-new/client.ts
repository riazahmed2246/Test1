import { Queue, QueueEvents } from 'bullmq';
import { ioRedis } from '../redis/redis.service';
import { v4 } from 'uuid';

export class BullMqClient {
  queues = new Map<string, Queue>();
  queueEvents = new Map<string, QueueEvents>();

  async connect(): Promise<any> {
    return;
  }

  async close() {
    return;
  }

  // The `ReadPacket` and `WritePacket` are specific to NestJS microservices.
  // We'll replace them with generic types or a custom interface.
  publish(
    packet: { pattern: string; data: any },
    callback: (packet: { response?: any; err?: any; isDisposed: boolean }) => void
  ) {
    // This method is for fire-and-forget, without waiting for a response.
    // In a real scenario, you'd add the job to the queue without `waitUntilFinished`.
    // We'll keep the original behavior for now, but note the dependency on NestJS's `ClientProxy`.
    this.publishAsync(packet, callback);
    return () => console.log('sent');
  }

  delete(pattern: string, jobId: string) {
    const queue = this.getQueue(pattern);
    return queue.remove(jobId);
  }

  deleteScheduler(pattern: string, jobId: string) {
    const queue = this.getQueue(pattern);
    return queue.removeJobScheduler(jobId);
  }

  async publishAsync(
    packet: { pattern: string; data: any },
    callback: (packet: { response?: any; err?: any; isDisposed: boolean }) => void
  ) {
    const queue = this.getQueue(packet.pattern);
    const queueEvents = this.getQueueEvents(packet.pattern);
    const job = await queue.add(packet.pattern, packet.data, {
      jobId: packet.data.id ?? v4(),
      ...packet.data.options,
      removeOnComplete: !packet.data.options.attempts,
      removeOnFail: !packet.data.options.attempts,
    });

    try {
      await job.waitUntilFinished(queueEvents);
      console.log('success');
      callback({ response: job.returnvalue, isDisposed: true });
    } catch (err) {
      console.log('err');
      callback({ err, isDisposed: true });
    }
  }

  getQueueEvents(pattern: string) {
    let queueEvents = this.queueEvents.get(pattern);
    if (!queueEvents) {
      queueEvents = new QueueEvents(pattern, {
        connection: ioRedis,
      });
      this.queueEvents.set(pattern, queueEvents);
    }
    return queueEvents;
  }

  getQueue(pattern: string) {
    let queue = this.queues.get(pattern);
    if (!queue) {
      queue = new Queue(pattern, {
        connection: ioRedis,
      });
      this.queues.set(pattern, queue);
    }
    return queue;
  }

  async checkForStuckWaitingJobs(queueName: string) {
    const queue = this.getQueue(queueName);
    const getJobs = await queue.getJobs('waiting' as any);
    const now = Date.now();
    const thresholdMs = 60 * 60 * 1000;
    return {
      valid: !getJobs.some((job) => {
        const age = now - job.timestamp;
        return age > thresholdMs;
      }),
    };
  }

  async dispatchEvent(packet: { pattern: string; data: any }): Promise<any> {
    console.log('event to dispatch: ', packet);
    const queue = this.getQueue(packet.pattern);
    if (packet?.data?.options?.every) {
      const { every, immediately } = packet.data.options;
      const id = packet.data.id ?? v4();
      await queue.upsertJobScheduler(
        id,
        { every, ...(immediately ? { immediately } : {}) },
        {
          name: id,
          data: packet.data,
          opts: {
            removeOnComplete: true,
            removeOnFail: true,
          },
        }
      );
      return;
    }

    await queue.add(packet.pattern, packet.data, {
      jobId: packet.data.id ?? v4(),
      ...packet.data.options,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
}