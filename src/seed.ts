import { db } from './firebase';
import { doc, setDoc, collection, writeBatch } from 'firebase/firestore';
import { Question } from './types';

export const seedDatabase = async () => {
  const batch = writeBatch(db);

  // 1. Initial Game State
  const gameStateRef = doc(db, 'game_state', 'current');
  batch.set(gameStateRef, {
    status: 'idle',
    currentQuestionId: null,
    startTime: null,
    round: 1
  });

  // 2. Sample Questions
  const questions: Question[] = [
    {
      id: '1',
      text: 'Which planet is known as the Red Planet?',
      type: 'mcq',
      options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
      correctIndex: 1,
      points: 100,
      duration: 15,
      round: 1
    },
    {
      id: '2',
      text: 'Identify this iconic landmark.',
      type: 'image',
      mediaUrl: 'https://picsum.photos/seed/paris/800/450',
      options: ['Eiffel Tower', 'Colosseum', 'Statue of Liberty', 'Big Ben'],
      correctIndex: 0,
      points: 150,
      duration: 20,
      round: 1
    },
    {
      id: '3',
      text: 'What is the capital of Japan?',
      type: 'mcq',
      options: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'],
      correctIndex: 2,
      points: 100,
      duration: 15,
      round: 2
    }
  ];

  questions.forEach((q) => {
    const qRef = doc(db, 'questions', q.id);
    batch.set(qRef, q);
  });

  await batch.commit();
  console.log('Database seeded successfully!');
};
