import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  clerkUserId: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ default: false })
  isAdmin: boolean;
}
