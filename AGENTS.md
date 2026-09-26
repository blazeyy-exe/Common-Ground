<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep changemaker, connection, and SDG records in dedicated typed data modules; derive explorer UI and globe objects from them so expanding the collection never requires component edits.
- Render the geographic globe client-side with React Three Fiber and bundled compact world topology; this avoids external runtime map dependencies and keeps the explorer responsive.
