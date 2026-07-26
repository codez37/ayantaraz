import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimitTier } from '../security/decorators';
import { UserRole } from '@prisma/client';
import { ChatQueryDto } from './dto/chat-query.dto';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

@Controller('chatbot')
export class ChatbotController {
  constructor(private chatbotService: ChatbotService) {}

  @Public()
  @RateLimitTier('chatbot')
  @Post('query')
  query(@Body() dto: ChatQueryDto, @CurrentUser('id') userId?: number) {
    return this.chatbotService.query(dto.question, userId);
  }

  @Get('conversation/:sessionId')
  getConversation(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatbotService.getConversation(sessionId, user.id, user.role);
  }

  @Get('knowledge')
  @Roles(UserRole.admin, UserRole.content_manager)
  getKnowledge(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.chatbotService.getKnowledgeBase(page || 1, limit || 20);
  }

  @Post('knowledge')
  @Roles(UserRole.admin, UserRole.content_manager)
  createKnowledge(
    @Body() dto: CreateKnowledgeDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatbotService.createKnowledgeEntry(dto, userId);
  }

  @Patch('knowledge/:id')
  @Roles(UserRole.admin, UserRole.content_manager)
  updateKnowledge(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKnowledgeDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatbotService.updateKnowledgeEntry(id, dto, userId);
  }
}
