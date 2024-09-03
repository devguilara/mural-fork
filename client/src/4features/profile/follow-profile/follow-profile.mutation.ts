import {
  DefaultError,
  UseMutationOptions,
  useMutation,
} from '@tanstack/react-query'
import { ProfileService } from '~6shared/api/profile'
import { queryClient } from '~6shared/lib/react-query'
import { ArticleQueries, articleTypes } from '~5entities/article'
import { ProfileQueries, profileTypes } from '~5entities/profile'

export function useFollowProfileMutation(
  options?: Pick<
    UseMutationOptions<
      Awaited<ReturnType<typeof ProfileService.followProfileMutation>>,
      DefaultError,
      profileTypes.Profile,
      unknown
    >,
    'mutationKey' | 'onMutate' | 'onSuccess' | 'onError' | 'onSettled'
  >,
) {
  const {
    mutationKey = [],
    onMutate,
    onSuccess,
    onError,
    onSettled,
  } = options || {}

  return useMutation({
    mutationKey: ['profile', 'follow', ...mutationKey],

    mutationFn: ({ username }: profileTypes.Profile) =>
      ProfileService.followProfileMutation(username),

    onMutate: async (updatedProfile) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: ProfileQueries.keys.root,
        }),
        queryClient.cancelQueries({ queryKey: ArticleQueries.keys.root }),
      ])

      const previousProfile = queryClient.getQueryData(
        ProfileQueries.profileQuery(updatedProfile.username).queryKey,
      )

      const previousArticlesBySlug =
        queryClient.getQueriesData<articleTypes.Article>({
          queryKey: ArticleQueries.keys.rootBySlug,
        })

      queryClient.setQueryData(
        ProfileQueries.profileQuery(updatedProfile.username).queryKey,
        updatedProfile,
      )

      queryClient.setQueriesData(
        { queryKey: ArticleQueries.keys.rootBySlug },
        (article: articleTypes.Article | undefined) => {
          if (!article) return
          if (article.author.username !== updatedProfile.username)
            return article
          return { ...article, author: updatedProfile }
        },
      )

      await onMutate?.(updatedProfile)

      return { previousProfile, previousArticlesBySlug }
    },

    onSuccess,

    onError: async (error, updatedProfile, context) => {
      const { previousProfile, previousArticlesBySlug } = context || {}

      queryClient.setQueryData(
        ProfileQueries.profileQuery(updatedProfile.username).queryKey,
        previousProfile,
      )

      queryClient.setQueriesData(
        { queryKey: ArticleQueries.keys.rootBySlug },
        previousArticlesBySlug,
      )

      await onError?.(error, updatedProfile, context)
    },

    onSettled: async (data, error, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ProfileQueries.keys.root,
        }),
        queryClient.invalidateQueries({
          queryKey: ArticleQueries.keys.root,
        }),
        onSettled?.(data, error, variables, context),
      ])
    },
  })
}
