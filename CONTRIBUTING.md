# Contributing to Formwerk

Thank you for your interest in contributing to Formwerk! This guide will help you get started with contributing to the project.

## How can I contribute?

Any help is appreciated, and we have several ways you can contribute:

- Reporting bugs.
- Answering questions on the [Discord server](https://discord.gg/gQ7wqpvT5X) or [GitHub issues](https://github.com/formwerkjs/formwerk/issues).
- Suggesting features.
- Writing code.
- Improving the documentation.
- Building UI libraries or tools that integrate with or use Formwerk.
- Creating content and tutorials.

## Before you start

If you plan to submit code changes, please make sure the changes are discussed in an issue first.

- If you are fixing a bug, it needs to be reported and acknowledged as a bug by the maintainers.
- If you are adding a new feature, it needs to be discussed in an issue or on Discord, and you should get the go-ahead from the maintainers.

Check the [FAQ](#faq) section for more information on how to pick an issue to work on, and other questions you might have.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies with `pnpm install -r`.
3. Run `pnpm dev` to start the development environment, which will:
   - Watch and rebuild as you make changes.
   - Fire up the playground app at [http://localhost:5173](http://localhost:5173).
   - Run tests in watch mode so you can see if your changes break anything.

## Development Scripts

- `pnpm test`: Runs tests.
- `pnpm lint`: Lints code with `oxlint`.
- `pnpm format`: Formats code with `oxfmt`.
- `pnpm build`: Builds packages.
- `pnpm typecheck`: Type checks TypeScript code.
- `pnpm playground:dev`: Runs the playground app locally.
- `pnpm changeset`: Generates a changeset for the current changes.

## Pull Request Guidelines

1. Create a branch from `main`.
2. If adding a new feature:
   - Add accompanying test case(s).
   - Provide a convincing reason for adding the feature or cite the issue or Discord discussion.
3. If fixing a bug:
   - Provide a detailed description of the bug in the PR.
   - Add appropriate test coverage if applicable.
4. Follow the existing code style and formatting guidelines.
5. Make sure all tests, type checks, and linting pass.
6. Update documentation if needed.
7. Add a [changeset file](https://github.com/changesets/changesets) with the script `pnpm changeset` so that the changelog is updated.

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. Format:

```txt
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- **type**: The type of change (e.g., `feat`, `fix`, `style`, `refactor`, `test`, `chore`).
- **scope**: The scope of the change, usually related to the component or package being changed.
- **description**: A short description of the change.
- **body**: A more detailed explanation of the change (optional).
- **footer**: Any additional information, such as breaking changes or issues closed (optional).

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CONDUCT.md). By participating in this project, you agree to abide by its terms.

## Additional Resources

- [Project Documentation](https://formwerk.dev)
- [Issue Tracker](https://github.com/formwerkjs/formwerk/issues)
- [Discord Server](https://discord.gg/gQ7wqpvT5X)
- [Formwerk on X (formerly Twitter)](https://x.com/useformwerk)
- [Formwerk on BlueSky](https://bluesky.social/formwerk.dev)

Thank you for contributing!

## FAQ

<details>
<summary>How do I pick an issue to work on?</summary>

Issues have multiple labels that can help you decide which issues to pick. If you are a newcomer, you most likely want to start with issues labeled as `bug` and `good first issue`.

Issues have priority labels that can help you decide the severity and urgency of the issue. `p0` is the highest priority, and `p3` is the lowest.

</details>

<details>
<summary>How do I contribute to the documentation?</summary>

The documentation lives in another repository, [formwerk.dev](https://github.com/formwerkjs/formwerk.dev), with its own guidelines and contribution process.

</details>

<details>
<summary>Is there a guide for the playground app?</summary>

The playground app is a Vue.js app used to test and showcase the Formwerk library. There are no requirements on its state, as long as the CI isn't complaining. It is there so that you can test your changes live.

</details>

<details>
<summary>How do I determine the changeset version type (major, minor, patch)?</summary>

Usually, bug fixes are `patch`, and new features are `minor`. However, a maintainer should help you determine the correct version type in the PR and will assign a label to the PR to reflect that. The labels are named `patch`, `minor`, and `major`.

</details>

<details>
<summary>I'm building an open-source library, a product, or a tool that integrates with or uses Formwerk. Can I get help with it?</summary>

One of the main Formwerk audiences is library authors. We are always happy to help and support you in building your library as well as promoting it in our ecosystem, homepage, or social media.

</details>

<details>
<summary>I created something cool with Formwerk. Can I add it to the showcase?</summary>

Absolutely! We love to see what people build with Formwerk. Post your cool projects in the [Discord server](https://discord.gg/gQ7wqpvT5X), and we will check it out and potentially add it to the showcase on the documentation [showcase page](https://formwerk.dev/showcase/).

</details>

<details>
<summary>I created a tutorial, a video, or an article about Formwerk. Can I add it to the showcase?</summary>

Absolutely! We have a dedicated [resources](https://formwerkjs.dev/extras/resources) page on the documentation where we list all the tutorials, videos, and articles about Formwerk. If you want to add yours, post it in the [Discord server](https://discord.gg/gQ7wqpvT5X), and we will check it out and add it to the resources page.

</details>
