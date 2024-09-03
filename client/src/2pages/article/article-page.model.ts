import { LoaderFunctionArgs, redirect } from 'react-router-dom'
import { z } from 'zod'
import { queryClient } from '~6shared/lib/react-query'
import { pathKeys, routerContracts } from '~6shared/lib/react-router'
import { SessionQueries, useSessionStore } from '~6shared/session'
import { ArticleQueries } from '~5entities/article'
import { CommentQueries } from '~5entities/comment'

const ArticleLoaderDataSchema = z.object({
  request: z.custom<Request>(),
  params: routerContracts.SlugPageParamsSchema,
  context: z.any(),
})

export type ArticleLoaderData = z.infer<typeof ArticleLoaderDataSchema>

export class ArticleLoader {
  static async indexPage() {
    return redirect(pathKeys.page404())
  }

  static async articlePage(args: LoaderFunctionArgs) {
    const articleData = ArticleLoader.getArticleLoaderData(args)
    const { slug } = articleData.params

    const promises = [
      queryClient.prefetchQuery(ArticleQueries.articleQuery(slug)),
      queryClient.prefetchQuery(CommentQueries.commentsQuery(slug)),
    ]

    if (useSessionStore.getState().session) {
      const currentUserQuery = SessionQueries.currentSessionQuery()
      promises.push(queryClient.prefetchQuery(currentUserQuery))
    }

    Promise.all(promises)

    return articleData
  }

  private static getArticleLoaderData(args: LoaderFunctionArgs) {
    return ArticleLoaderDataSchema.parse(args)
  }
}
