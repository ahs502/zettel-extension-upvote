import { ZettelExtensions } from '@zettelooo/extension-api'
import { Id } from '@zettelooo/commons'

// Type definition for stored extended data on cards:
type CardExtensionData = undefined | { readonly upvotingUserIds: readonly Id[] }

// The main body of module code:
void ((window as ZettelExtensions.WindowWithStarter).$starter = function (api) {
  // Access API which is only available when the user is signed-in:
  this.while('signedIn', function ({ signedInApi }) {
    // Access API to handle each displaying card:
    this.while('card', function ({ cardApi }) {
      // Append the upvote button to the card as an extended injected HTML:
      const upvoteButtonRegistration = this.register(
        cardApi.registry.extendedHtmlContent<{
          readonly numberOfUpvotes: number
          readonly alreadyUpvotedByThisUser: boolean
        }>(() => ({
          initialState: {
            numberOfUpvotes: 0,
            alreadyUpvotedByThisUser: false,
          },
          render: ({ renderContext }) => ({
            encapsulated: true,
            html: `
<style>
  #root {
    position: relative;
    margin-top: ${renderContext.theme.unitPx * -2}px;
    padding: 0 ${renderContext.theme.unitPx * 2}px;
    display: flex;
    justify-content: flex-end;
  }
  .upvote-button {
    border: 2px solid ${renderContext.theme.palette.divider};
    border-radius: ${renderContext.theme.unitPx * 2}px;
    height: ${renderContext.theme.unitPx * 4}px;
    padding: ${renderContext.theme.unitPx * 0.25}px;
    display: inline-flex;
    align-items: center;
    gap: ${renderContext.theme.unitPx * 1}px;
    font-size: ${renderContext.theme.unitPx * 2}px;
    cursor: pointer;
    background-color: ${renderContext.theme.palette.background.paper};
  }
  .upvoted {
    background-color: ${renderContext.theme.palette.primary.main};
    color: ${renderContext.theme.palette.primary.contrastText};
  }
  .upvotes-count {
    padding-left: ${renderContext.theme.unitPx * 1}px;
  }
  .upvote-icon {
    height: 100%;
  }
</style>

<div id="root">
  <button class="upvote-button" title="👍 Upvote">
    <span class="upvotes-count"></span>
    <img class="upvote-icon" src="${api.getFileUrl({ filePath: 'upvote-icon.png' })}" alt="👍" />
  </button>
</div>
`,
            onRendered: ({ sanitizedHtml, containerElement, currentContext }) => {
              const root = containerElement.querySelector('#root') as HTMLDivElement
              const upvoteButton = root.querySelector('.upvote-button') as HTMLButtonElement
              const upvotesCount = upvoteButton.querySelector('.upvotes-count') as HTMLSpanElement

              upvoteButton.addEventListener('click', async event => {
                const cardExtensionData = cardApi.data.card.extensionData as CardExtensionData
                await signedInApi.access.setCardExtensionData<CardExtensionData>(cardApi.target.cardId, {
                  upvotingUserIds: currentContext.state.alreadyUpvotedByThisUser
                    ? cardExtensionData?.upvotingUserIds.filter(userId => userId !== signedInApi.data.account.id) ?? []
                    : [...(cardExtensionData?.upvotingUserIds ?? []), signedInApi.data.account.id],
                })
              })

              applyState()

              function applyState(): void {
                if (currentContext.state.alreadyUpvotedByThisUser) {
                  upvoteButton.classList.add('upvoted')
                } else {
                  upvoteButton.classList.remove('upvoted')
                }
                upvotesCount.style.display = currentContext.state.numberOfUpvotes > 0 ? 'inline' : 'none'
                upvotesCount.innerText = String(currentContext.state.numberOfUpvotes)
              }

              return {
                onUpdateState: applyState,
              }
            },
          }),
          position: 'bottom',
        }))
      )

      // Read the stored extended data on the card and watch for its changes:
      this.register(
        cardApi.watch(
          data => data.card.extensionData as CardExtensionData,
          cardExtensionData => {
            // Apply updates to the appended upvote button:
            upvoteButtonRegistration.reference.current?.setState({
              numberOfUpvotes: cardExtensionData?.upvotingUserIds.length ?? 0,
              alreadyUpvotedByThisUser:
                cardExtensionData?.upvotingUserIds.includes(signedInApi.data.account.id) ?? false,
            })
          },
          {
            initialCallback: true,
          }
        )
      )
    })
  })
})
