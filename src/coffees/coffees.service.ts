import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Coffee } from './entities/coffee.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { CreateCoffeeDto } from './dto/create-coffee.dto';
import { UpdateCoffeeDto } from './dto/update-coffee.dto';
import { Flavor } from './entities/flavor.entity';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Event } from 'src/events/entities/event.entity';
import { ConfigType } from '@nestjs/config';
import CoffeesConfig from './config/coffees.config';

@Injectable()
export class CoffeesService {
  constructor(
    @InjectRepository(Coffee)
    private readonly coffeeRepository: Repository<Coffee>,
    @InjectRepository(Flavor)
    private readonly flavorRepository: Repository<Flavor>,
    private readonly connection: Connection,
    // private readonly configService: ConfigService,
    @Inject(CoffeesConfig.KEY)
    private readonly coffeesConfigration: ConfigType<typeof CoffeesConfig>,
  ) {
    // const coffeesConfig = this.coffeesConfigration.get('coffees.foo');
    console.log(coffeesConfigration);
  }

  findAll(paginationQueryDto: PaginationQueryDto) {
    const { limit, offset } = paginationQueryDto;
    return this.coffeeRepository.find({
      relations: ['flavors'],
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: number) {
    const coffee = await this.coffeeRepository.findOne({
      where: { id },
      relations: ['flavors'],
    });
    if (!coffee) {
      throw new NotFoundException(`Coffee #${id} not found`);
    }
    return coffee;
  }

  async create(createCoffeeDto: CreateCoffeeDto) {
    console.log(createCoffeeDto);

    // const flavors = await Promise.all(
    //   createCoffeeDto.falvors.map((name) => this.preloadFlavorByName(name)),
    // );
    // const coffee = this.coffeeRepository.create({
    //   ...createCoffeeDto,
    //   flavors,
    // });
    // return this.coffeeRepository.save(coffee);
  }

  async update(id: number, updateCoffeeDto: UpdateCoffeeDto) {
    console.log(id, updateCoffeeDto);
    // const flavors =
    //   UpdateCoffeeDto &&
    //   (await Promise.all(
    //     updateCoffeeDto.falvors.map((name) => this.preloadFlavorByName(name)),
    //   ));
    // const coffee = this.coffeeRepository.create({
    //   ...updateCoffeeDto,
    //   flavors,
    // });
    // if (!coffee) {
    //   throw new NotFoundException(`Coffee #${id} not found`);
    // }
    // return this.coffeeRepository.save(coffee);
  }

  async delete(id: number) {
    const coffee = await this.findOne(id);
    return this.coffeeRepository.remove(coffee);
  }

  async recommendCoffee(coffee: Coffee) {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      coffee.recommendations++;
      const recommendEvent = new Event();
      recommendEvent.name = 'recommend-coffee';
      recommendEvent.type = 'coffee';
      recommendEvent.payload = { coffeeId: coffee.id };

      await queryRunner.manager.save(coffee);
      await queryRunner.manager.save(recommendEvent);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  private async preloadFlavorByName(name: string): Promise<Flavor> {
    const existingFlavor = await this.flavorRepository.findOne({
      where: { name },
    });
    if (existingFlavor) {
      return existingFlavor;
    }
    return this.flavorRepository.create({ name });
  }
}
