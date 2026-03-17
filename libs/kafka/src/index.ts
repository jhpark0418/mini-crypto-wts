import { Consumer, Kafka, logLevel, Producer } from "kafkajs";

export type KafkaClientOptions = {
    clientId: string;
    brokers: string[];
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