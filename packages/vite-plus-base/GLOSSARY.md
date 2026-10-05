# vite-plus-base

The bingo-stratum template that scaffolds a Vite+ repository.

## Language

**Node pin**:
The single exact Node.js version a repository develops with. Local tooling and CI both install this version.
_Avoid_: Engines range, runtime version

**Engines range**:
The Node.js versions a package claims its consumers can use.
_Avoid_: Node pin

**Package workspace**:
A repository that groups multiple packages under one package manager.
_Avoid_: Editor workspace, bingo workspace
