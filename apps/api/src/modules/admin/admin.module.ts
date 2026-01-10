import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserImporterService } from './importers/user-importer.service';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads/temp',
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, UserImporterService],
  exports: [AdminService],
})
export class AdminModule {}
