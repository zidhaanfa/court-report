import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UserStatus } from '@court-workflow/shared';
import { PaginationMeta } from '@court-workflow/shared';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ data: User[]; meta: PaginationMeta }> {
    const [users, total] = await this.userRepository.findAndCount({
      relations: { roles: { permissions: true } },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { roles: { permissions: true } },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException(
        `User with email "${createUserDto.email}" already exists`,
      );
    }

    const passwordHash = await bcrypt.hash(
      createUserDto.password,
      BCRYPT_ROUNDS,
    );

    const user = this.userRepository.create({
      email: createUserDto.email,
      passwordHash,
      fullName: createUserDto.fullName,
      phone: createUserDto.phone,
      city: createUserDto.city,
    });

    const savedUser = await this.userRepository.save(user);
    return this.findOne(savedUser.id);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);

    await this.userRepository.save(user);
    return this.findOne(id);
  }

  async softDelete(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot delete yourself');
    }

    const user = await this.findOne(id);
    user.status = UserStatus.INACTIVE;
    await this.userRepository.save(user);
  }

  async assignRole(userId: string, roleId: string): Promise<User> {
    const user = await this.findOne(userId);
    const role = await this.roleRepository.findOne({ where: { id: roleId } });

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }

    const alreadyHasRole = user.roles.some((r) => r.id === roleId);
    if (alreadyHasRole) {
      throw new BadRequestException('User already has this role');
    }

    user.roles.push(role);
    await this.userRepository.save(user);
    return this.findOne(userId);
  }

  async removeRole(
    userId: string,
    roleId: string,
    currentUserId: string,
  ): Promise<User> {
    const user = await this.findOne(userId);

    const role = user.roles.find((r) => r.id === roleId);
    if (!role) {
      throw new NotFoundException('User does not have this role');
    }

    // Cannot remove ADMIN role if only one admin remains
    if (role.name === 'ADMIN') {
      const adminCount = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.roles', 'role')
        .where('role.name = :roleName', { roleName: 'ADMIN' })
        .getCount();

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last ADMIN role from the system',
        );
      }
    }

    user.roles = user.roles.filter((r) => r.id !== roleId);
    await this.userRepository.save(user);
    return this.findOne(userId);
  }

  async findAvailableReporters(city?: string): Promise<User[]> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('role.name = :roleName', { roleName: 'REPORTER' })
      .andWhere('user.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE });

    if (city) {
      // Sort same-city reporters first
      qb.addOrderBy(
        `CASE WHEN user.city = '${city}' THEN 0 ELSE 1 END`,
        'ASC',
      );
    }

    qb.addOrderBy('user.fullName', 'ASC');

    return qb.getMany();
  }

  async findAvailableEditors(): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('role.name = :roleName', { roleName: 'EDITOR' })
      .andWhere('user.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
      .orderBy('user.fullName', 'ASC')
      .getMany();
  }
}
