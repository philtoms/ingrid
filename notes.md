# TODO

- ~interpret: id in context~
- compile: filter out empty instructions - requires deeper compiler optimisation
- parse: capture individual selectors, output as array
  - carry tag independence through to compiler, or another way of putting it:
  - scope is included into tag but not id
  - parsed and resolved output is therefore keyed on tag not id.
  - so far
    - temporal statements are parsed as intentions
    - all immediates in temporal S are put into same intention
    - todo: fix re-entry

# To Notes

Abstraction facilitates the need to think in large chucks of cooperating patterns. Examples:

- Musical counter point can be managed and represented through approprialy coupled abstractions.

## Compiler

### tag or id, call or apply

An id represents a unique, resolved identity (value)
A tag represents the set of ids that would be resolved

A1 resolves to A1
A\* resolves to A1, A2...

resolved ids are either called directly or applied depending on the context of the reference tag: If it is a message tag it is called otherwise it is applied.

B1 is A1 applies A1 to B1
B1 is A1 + 1 calls B1 directly because it is a message

### Message selectors

Activation order
Given `B is A(x, y)`

Then
`A(x, y)` selects A.x.y and overrides...

`A() { x(value) y(value) }` selects x then y then A

## Statements

Ingrid statements have one tag, multiple intentions and the all important statement block.
Level-1 statements are deemed useful enough to be loaded directly into a frame and do not require an explicit intention (but can be included for intentional transparency). Overridabe level-1 manifest may be exposed.

## Frames

Ingrid applications run in frames. A frame holds tag chains and context (state).

Frames survive the lifetime of a compilation cycle, thus an application state is maintained through development, testing and so on. Context can be cleared down, rolled back and even rolled forwards providing the notion of versioned context (with optional migrators).

## DSLs

each frame is a micro system that holds overridable tag, before, after, is entry points. Each entry point attracts its own before, after or immediate intentions.

DSLs are created by exploiting these entry points (intents may need to be escaped or quoted).

```
grid is math, array {
  rows == max(cell.row, rows)
  cols == max(cell.col, cols)
  matrix is transient == [cols, rows]
  cell:/(row:[A-Z]+)(col:\d+)/ is tag {
    tag(value) is matrix[col,row](value)
  }
}

```

notes:

- cell binds to tag: afters, befores and immediates. Any cell tag will capture its own col and row tag values, but the lexically scoped cell will only exhibit the latest values. This is a copy on write behaviour. COW is currently implicit and may prove to be a difficult concept.
- rows attracts cell.after so takes latest values. It _may_ require more specific syntax:
  `rows is max(cell.row, rows) after cell`
- cell.value maps to matrix. value has special semantics and does not require message handler. This provides cell with controlled read / write semantics but note: cell.value() is not valid
- Array and math are imported statements. Array provides tag syntax. It may be promoted to a level-1 statement.

### DSL strategy 1

DSL statements are core level statements that define a tag, an intention and an optional block.
The intention is a compiler directive that binds a statement to the appropriate compile phases.

parse:
Selectors must have the appropriate signature for the intention in question.
Regex selectors capture new syntax (Peg will be generated).
resolve:
The intention can be temporal.
compile:
The optional block must define the intended statement.
The block tag must be the intention and can optionally hold a value message.
The tag(message) syntax will be compiled into the selector DSL
The block can define other statements

key DSL statements

- /statement/(tag intention\* block?) is statement
- /tag/(value\*) is tag
- /intention/(intent, expression) is intention
- /intent/(token) is intent
- /expression/(parts+) is expression -- parts is an array of aliased matches
- /block/(statement\*) is block

full syntax

```

/==/(token) is intent after token_expr {
  intent(value) is expression // where expression is compiled directly into code
}

```

### DSL strategy 2

Revised syntax uses block signature to capture cascading compile events and their run time values. This strategy builds on standard semantics and uses explicit message passing to bind run time values. Arbitrary block selectors not bound to run-time selamntics are compile time evaluated (see predicate). Compile time evaluation generates lexical output that attracts appropriate parse, resolution and compilation phases.

```

valueIntention is intention after intent = /^[+-=]=\$/ {
  tag(id:\*) -- accept any value signature
  intent -- read only
  expression
    is tag(expression) after expression and intent = '=='
    is tag(tag + expression) after expression and intent = '+='
}

-- strong types?
date:`[(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})]` is tag

dateRange is date {
  year after year = 2010..2020 -- 2009-05-27 asserts with `ASSERT (2009)-05-27 != year = 2010..2020`
}

-- core syntax

precident:`( '(' expression ')') / ((token / str ) message*) (token expression)*)`
is expression
{
  -- local token
  op:`'*' / '/' / '+' / '-'` is token {
    token { kind is 'op'}
    -- select token precidence
    /\*/ {prec is 2}
    /+/ {prec is 1}
  }

  -- parts binds to expression.parts drives parse phase
  parts() is list
  is parts() after postfix(parts.length, 0, '>')

  op is parts.next() before parts and parts.kind = 'op'
  opstack is stack
  -- is push(op) after op and prec < op.prec
  is push(op) after postfix(op, '!!', prec, op.prec, '<', 'and')

  args\*
  += parts.next() before postfix(parts, parts.kind, 'op', '!=')
  += stack.pop() before postfix(stack.length, stack.prec, op.prec, '>', 'and')

  -- expression is parsed in parse phase
  -- bound to tag in compile phase
  action is postfix(args)
}

```

notes:

- compile time semantics deal exclusively with lexical resolution
  - Passing intent to expression is a lexical concern (the lexically resolved value of intent).
  - postfix(args) resolves to the lexical values pushed onto args
- parts is generated by expression visitor
- opstack and args are compile time intentions
- core op predicates but no precidence. Hence op is a locally scoped tag
- ASSERT is a quality driven intention of after / before

### DSL strategy 3

```
expression:`arg (op expression)?` is tag {
  arg:`tag`
  op:`'*' / '/' / '+' / '-'`? {
    ('*') {prec is 2}
    ('+') {prec is 1}
  }

  opstack* is op
    is expression.op after postfix(push, true, '=')

  parts+ is arg
    // after push = false && opstack.pop
    is opstack.pop() after postfix(push, false, '=', opstack.pop, '&&')

  push is postfix(expression.op.prec, opstack.top.prec, '>')

  tag is postfix(parts, expression.parts)
}
```

notes:

- peg rule syntax
- op and arg are block rules (expression.op and expression.arg)
- op and arg and expression are rule selectors, op and arg re aliased
- tag is the output rule
- literal messages used to aggregate intentions - op('+')
- quantifiers control how tokens are received and processed
  - ? ensures safe intention syntax as in: parts is op (if op exists)

## Intentions

Intentions resolve down to {intent, [selectorRef*]}. This means that any two identical intentions will be merged.

### Temporal intentions

After intentions are activated after any of the referenced selectors. Temporal after expressions will therefore resolve to the latest tag values.

Before intentions are activated before any of the references selectors. Temporal before expressions will therefore resolve to the negated result of current tag values

`A1 before B1 = 10 -- activate before B1 if !(current B1.value = 10)`

Temporal intentions are debounced.

## Expressions

Ingrid expressions are selectors and message selectors. In order to capture a higher order expression such as `A + B`, the expression must first be parsed into message tag `math.expression(A, B, +)`

## values and intentions

There are no types or instances of types (and strictly speaking, no objects), only value references and intentions. The immidiate intention 'B is A' means that B references A including its value at the point the intention is exercised, ie immediately.

If A's value reference subsequently changes, B does not change with it. But if the intention 'B is A' is re-applied, then B will take A's latest value reference.

If B's value reference subsequently changes, then A does not change with it.

### Slots and quantifiers

Intentional values are stored against a tag. Without quantifiers, the values will be superimposed in slot 0. Thus A is 1 is 2 after B makes sense as a predicate statement

Quantifiers extend the notion of slots

- \+ and \* will extend slots indefinately - ie list semantics
- {s:e} will superimpose on the selector range - ie array semantics

## Inheritance - one dot rule

B inherits all of A's intentions including its block intentions: A.a becomes B.a
C inherits all of B's intentions but none of A's intentions: B.b becomes C.b but B.a is not available.

C only inherits A through B explicitly

```

A {a}
B is A {a} // TODO ensure that B.a resolves to A.a and displaces implicit resolution
C is B // C.a -> B.a -> A.a

```

## Application

All entry point selectors are applied. This is a specialisation of the general behaviour of tag application - all immediate intentions including block intentions are applied.

### requires (import?)

Modules are imported explicitly into the current frame context according to the import syntax

- A is './moduleB' -- applies all of B's entrypoints directly to A - A is B1, B2
- A has './moduleB' -- applies all of B's entrypoints to A at Block level - A {B1, B2}

Imported selectors are therefore namespaced and application behaviour is the same as if the module had been defined immediately.

Imports are applied at the AST level. Modules frames that do not export AST must be reverse parsed.

The understated consequence of this compile time behaviour is that higher level intentions will be required into increasingly lower levels down to the physical layers where the intentions are eventually bound and executed.

## Optimisation notes

Value reference is lexically established at compile time. This includes immediate instance references and explicit messages. The heap system can be reduced to just those values that are known to change via one of these mechanisms. The heap can be constructed as a static immutable compile known block + a mutable algorithm (GC or weeding?)

Selector chains are also lexically analysed for redundancy

## Message holders

Temporal intentions take precidence over messages thus blocking message handling

## Alias and tags

Alias is a context free identifier that can be attached to a single tag. A tag can only have one alias. Alias scope is statement.

Tag is a context free identifier that can be attached to several selectors. A tag can have any number of tags. Tags can be used to group selectors. Tag scope is global.

`A::B::C:ABC is A, B, C, ABC -- all select ABC`
`A::B is A A::C is A -- selects B, C in both cases`

## Intro ideas

- the problem: indeterminism vs determinism
  - or humans vs machines
  - early languages for complexity
  - ingrid for agreement
  - immediate + temporal == agile
- universal language
  - consistent across disiplines and domains
  - shared learning curve
    - simple syntax
    - complex but consistent semantics (orthoganol)
    - increasing returns
  - intentional stance
  - iterate over agreement
    - invent DSL where necessary
