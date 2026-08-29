import type { GraphQLResolveInfo } from 'graphql'
import type { EventRecord } from '../../repositories/eventRepository.js'
import type { FeedbackRecord } from '../../repositories/feedbackRepository.js'
import type { GraphQLContext } from '../context.js'
export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type RequireFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>
}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
}

/** A predefined event that can receive anonymous feedback. */
export type Event = {
  __typename?: 'Event'
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
}

/** One immutable feedback submission recorded by the server. */
export type Feedback = {
  __typename?: 'Feedback'
  createdAt: Scalars['String']['output']
  event: Event
  id: Scalars['ID']['output']
  rating: Scalars['Int']['output']
  text: Scalars['String']['output']
}

/** A forward-only page of feedback and its continuation metadata. */
export type FeedbackConnection = {
  __typename?: 'FeedbackConnection'
  items: Array<Feedback>
  pageInfo: PageInfo
}

/** Stable machine-readable codes for expected submission failures. */
export enum FeedbackErrorCode {
  EmptyText = 'EMPTY_TEXT',
  InvalidEvent = 'INVALID_EVENT',
  InvalidRating = 'INVALID_RATING',
  TextTooLong = 'TEXT_TOO_LONG',
}

export type Mutation = {
  __typename?: 'Mutation'
  /** Validates, persists, and publishes one anonymous submission. */
  submitFeedback: SubmitFeedbackPayload
}

export type MutationSubmitFeedbackArgs = {
  input: SubmitFeedbackInput
}

/** Describes whether and where the client can request an older page. */
export type PageInfo = {
  __typename?: 'PageInfo'
  endCursor?: Maybe<Scalars['String']['output']>
  hasNextPage: Scalars['Boolean']['output']
}

export type Query = {
  __typename?: 'Query'
  /** Lists every predefined event for the selection control. */
  events: Array<Event>
  /** Returns one newest-first page for an event and optional rating. */
  feedback: FeedbackConnection
}

export type QueryFeedbackArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  eventId: Scalars['ID']['input']
  first?: InputMaybe<Scalars['Int']['input']>
  rating?: InputMaybe<Scalars['Int']['input']>
}

/** Anonymous feedback supplied by the attendee. */
export type SubmitFeedbackInput = {
  eventId: Scalars['ID']['input']
  rating: Scalars['Int']['input']
  text: Scalars['String']['input']
}

/** Returns either persisted feedback or structured validation errors. */
export type SubmitFeedbackPayload = {
  __typename?: 'SubmitFeedbackPayload'
  errors: Array<UserError>
  feedback?: Maybe<Feedback>
}

export type Subscription = {
  __typename?: 'Subscription'
  /** Streams newly persisted feedback for one event. */
  feedbackAdded: Feedback
}

export type SubscriptionFeedbackAddedArgs = {
  eventId: Scalars['ID']['input']
}

/** An expected validation failure suitable for direct UI presentation. */
export type UserError = {
  __typename?: 'UserError'
  code: FeedbackErrorCode
  field?: Maybe<Scalars['String']['output']>
  message: Scalars['String']['output']
}

export type WithIndex<TObject> = TObject & Record<string, any>
export type ResolversObject<TObject> = WithIndex<TObject>

export type ResolverTypeWrapper<T> = Promise<T> | T

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>
}
export type Resolver<
  TResult,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<TResult> | TResult

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> {
  subscribe: SubscriptionSubscribeFn<
    { [key in TKey]: TResult },
    TParent,
    TContext,
    TArgs
  >
  resolve?: SubscriptionResolveFn<
    TResult,
    { [key in TKey]: TResult },
    TContext,
    TArgs
  >
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>
}

export type SubscriptionObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> =
  | ((
      ...args: any[]
    ) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>

export type TypeResolveFn<
  TTypes,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>

export type IsTypeOfResolverFn<
  T = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo,
) => boolean | Promise<boolean>

export type NextResolverFn<T> = () => Promise<T>

export type DirectiveResolverFn<
  TResult = Record<PropertyKey, never>,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>
  Event: ResolverTypeWrapper<EventRecord>
  Feedback: ResolverTypeWrapper<FeedbackRecord>
  FeedbackConnection: ResolverTypeWrapper<
    Omit<FeedbackConnection, 'items'> & {
      items: Array<ResolversTypes['Feedback']>
    }
  >
  FeedbackErrorCode: FeedbackErrorCode
  ID: ResolverTypeWrapper<Scalars['ID']['output']>
  Int: ResolverTypeWrapper<Scalars['Int']['output']>
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>
  PageInfo: ResolverTypeWrapper<PageInfo>
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>
  String: ResolverTypeWrapper<Scalars['String']['output']>
  SubmitFeedbackInput: SubmitFeedbackInput
  SubmitFeedbackPayload: ResolverTypeWrapper<
    Omit<SubmitFeedbackPayload, 'feedback'> & {
      feedback?: Maybe<ResolversTypes['Feedback']>
    }
  >
  Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>
  UserError: ResolverTypeWrapper<UserError>
}>

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Scalars['Boolean']['output']
  Event: EventRecord
  Feedback: FeedbackRecord
  FeedbackConnection: Omit<FeedbackConnection, 'items'> & {
    items: Array<ResolversParentTypes['Feedback']>
  }
  ID: Scalars['ID']['output']
  Int: Scalars['Int']['output']
  Mutation: Record<PropertyKey, never>
  PageInfo: PageInfo
  Query: Record<PropertyKey, never>
  String: Scalars['String']['output']
  SubmitFeedbackInput: SubmitFeedbackInput
  SubmitFeedbackPayload: Omit<SubmitFeedbackPayload, 'feedback'> & {
    feedback?: Maybe<ResolversParentTypes['Feedback']>
  }
  Subscription: Record<PropertyKey, never>
  UserError: UserError
}>

export type EventResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Event'] =
    ResolversParentTypes['Event'],
> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>
}>

export type FeedbackResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Feedback'] =
    ResolversParentTypes['Feedback'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  event?: Resolver<ResolversTypes['Event'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  rating?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>
}>

export type FeedbackConnectionResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['FeedbackConnection'] =
    ResolversParentTypes['FeedbackConnection'],
> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['Feedback']>, ParentType, ContextType>
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>
}>

export type MutationResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Mutation'] =
    ResolversParentTypes['Mutation'],
> = ResolversObject<{
  submitFeedback?: Resolver<
    ResolversTypes['SubmitFeedbackPayload'],
    ParentType,
    ContextType,
    RequireFields<MutationSubmitFeedbackArgs, 'input'>
  >
}>

export type PageInfoResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['PageInfo'] =
    ResolversParentTypes['PageInfo'],
> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
}>

export type QueryResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Query'] =
    ResolversParentTypes['Query'],
> = ResolversObject<{
  events?: Resolver<Array<ResolversTypes['Event']>, ParentType, ContextType>
  feedback?: Resolver<
    ResolversTypes['FeedbackConnection'],
    ParentType,
    ContextType,
    RequireFields<QueryFeedbackArgs, 'eventId' | 'first'>
  >
}>

export type SubmitFeedbackPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['SubmitFeedbackPayload'] =
    ResolversParentTypes['SubmitFeedbackPayload'],
> = ResolversObject<{
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>
  feedback?: Resolver<
    Maybe<ResolversTypes['Feedback']>,
    ParentType,
    ContextType
  >
}>

export type SubscriptionResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Subscription'] =
    ResolversParentTypes['Subscription'],
> = ResolversObject<{
  feedbackAdded?: SubscriptionResolver<
    ResolversTypes['Feedback'],
    'feedbackAdded',
    ParentType,
    ContextType,
    RequireFields<SubscriptionFeedbackAddedArgs, 'eventId'>
  >
}>

export type UserErrorResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['UserError'] =
    ResolversParentTypes['UserError'],
> = ResolversObject<{
  code?: Resolver<ResolversTypes['FeedbackErrorCode'], ParentType, ContextType>
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>
}>

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  Event?: EventResolvers<ContextType>
  Feedback?: FeedbackResolvers<ContextType>
  FeedbackConnection?: FeedbackConnectionResolvers<ContextType>
  Mutation?: MutationResolvers<ContextType>
  PageInfo?: PageInfoResolvers<ContextType>
  Query?: QueryResolvers<ContextType>
  SubmitFeedbackPayload?: SubmitFeedbackPayloadResolvers<ContextType>
  Subscription?: SubscriptionResolvers<ContextType>
  UserError?: UserErrorResolvers<ContextType>
}>
