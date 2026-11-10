export interface IBaseRepository<T, CreateDto, UpdateDto, FilterDto> {
  create(data: CreateDto): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(filter: FilterDto): Promise<{ data: T[]; total: number }>;
  update(id: string, data: UpdateDto): Promise<T>;
  delete(id: string): Promise<T>;
  exists(id: string): Promise<boolean>;
}
