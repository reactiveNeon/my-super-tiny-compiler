interface Token {
    type: string
    value: string
}

interface Literal {
    value: string
}

interface NumberLiteral extends Literal {
    type: "NumberLiteral"
}

interface StringLiteral extends Literal {
    type: "StringLiteral"
}

interface CallExpression {
    type: "CallExpression"
    name: string
    params: ASTNode[]
}

type ASTNode = NumberLiteral 
    | StringLiteral 
    | CallExpression

interface AST {
    type: string
    body: ASTNode[]
}

function tokenizer(input: string): Token[] {
    const tokens: Token[] = []

    const parens = new Map<string, string>([
        ["(", "paren"],
        [")", "paren"],
    ])

    const WHITESPACE = /\s/
    const NUMBER = /[0-9]/
    const LETTER = /[a-z]/i

    let i = 0
    while(i < input.length) {
        let char = input[i]

        if(parens.has(char)) {
            tokens.push({ type: parens.get(char)!, value: char })
            ++i
            continue
        }

        if(WHITESPACE.test(char)) {
            ++i
            continue
        }

        if(NUMBER.test(char)) {
            let value = ""
            value += char
            char = input[++i]

            while(NUMBER.test(char)) {
                value += char
                char = input[++i]
            }

            tokens.push({ type: "number", value: value })
            continue
        }

        if(char === '"') {
            let value = ""

            char = input[++i]
            while(char !== '"') {
                value += char
                char = input[++i]
            }
            char = input[++i]

            tokens.push({ type: "string", value: value })
            continue
        }

        if(LETTER.test(char)) {
            let value = ""
            value += char
            char = input[++i]

            while(LETTER.test(char)) {
                value += char
                char = input[++i]
            }

            tokens.push({ type: "name", value: value })
            continue
        }

        throw new TypeError("Character " + char + " not identified")
    }

    return tokens
}

function parser(tokens: Token[]): AST {
    const ast: AST = {
        type: "Program",
        body: [],
    }

    let i = 0
    while(i < tokens.length) {
        const node = walk()
        ast.body.push(node)
    }

    function walk(): ASTNode {
        let token = tokens[i]
 
        if(token.type === "number") {
            ++i
            return { 
                type: "NumberLiteral", 
                value: token.value 
            }
        }

        if(token.type === "string") {
            ++i
            return {
                type: "StringLiteral",
                value: token.value
            }
        }

        if(token.type === "paren" && token.value === "(") {
            token = tokens[++i]

            const node: ASTNode = {
                type: "CallExpression",
                name: token.value,
                params: []
            }

            token = tokens[++i]

            while(
                token.type !== "paren" || 
                (token.type === "paren" && token.value !== ")")
            ) {
                const paramNode = walk()
                node.params.push(paramNode)
                token = tokens[i]
            }

            ++i
            return node
        }

        throw new TypeError("Token not identified: " + token.type + " " + token.value)
    }

    return ast
}

const sample_input = "(add 2 (substract 4 2))"

const tokens = tokenizer(sample_input)
const ast = parser(tokens)

console.log(tokens)
console.log(ast)