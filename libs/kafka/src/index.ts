import { Consumer, Kafka, logLevel, Producer } from "kafkajs";

export type KafkaClientOptions = {
    clientId: string;
    brokers: string[];
}

export type EnsureTopicInput = 
    | string
    | {
        topic: string;
        numPartitions?: number;
        replicationFactor?: number;
    };

export async function ensureTopics(params: {
    clientId: string;
    brokers: string[];
    topics: EnsureTopicInput[];
}) {
    const admin = await createAdmin({
        clientId: params.clientId,
        brokers: params.brokers
    });

    try {
        await admin.createTopics({
            waitForLeaders: true,
            topics: params.topics.map((item) => {
                if (typeof item === "string") {
                    return {
                        topic: item,
                        numPartitions: 1,
                        replicationFactor: 1
                    };
                }

                return {
                    topic: item.topic,
                    numPartitions: item.numPartitions ?? 1,
                    replicationFactor: item.replicationFactor ?? 1
                };
            })
        });
    } finally {
        await admin.disconnect();
    }
}

export function createKafka({clientId, brokers}: KafkaClientOptions) {
    return new Kafka({
        clientId,
        brokers,
        logLevel: logLevel.NOTHING
    });
}

export async function createProducer(options: KafkaClientOptions): Promise<Producer> {
    const kafka = createKafka(options);
    const producer = kafka.producer();
    await producer.connect();
    return producer;
}

export async function createConsumer(
    options: KafkaClientOptions & { groupId: string }
): Promise<Consumer> {
    const kafka = createKafka(options);
    const consumer = kafka.consumer({ groupId: options.groupId });
    await consumer.connect();
    return consumer;
}

export async function publishJson(
    producer: Producer,
    topic: string,
    payload: unknown
) {
    await producer.send({
        topic,
        messages: [{ value: JSON.stringify(payload) }]
    });
}

export async function createAdmin(params: { clientId: string, brokers: string[] }) {
    const kafka = new Kafka({
        clientId: params.clientId,
        brokers: params.brokers
    });

    const admin = kafka.admin();
    await admin.connect();
    return admin;
}