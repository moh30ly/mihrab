export function HadithSources() {
  return (
    <footer className="mt-12 border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
      <p>
        Arabic texts, English and Turkish translations, and gradings from the{" "}
        <a className="underline underline-offset-2" href="https://github.com/fawazahmed0/hadith-api" rel="noopener">
          hadith-api
        </a>{" "}
        dataset by Fawaz Ahmed, released into the public domain; see its{" "}
        <a className="underline underline-offset-2" href="https://github.com/fawazahmed0/hadith-api/blob/1/References.md" rel="noopener">
          list of references
        </a>
        . Hadith numbers follow that dataset. Gradings are
        given as the dataset lists them, with the scholar who gave each one. The collections are loaded only when you open them.
      </p>
    </footer>
  )
}
