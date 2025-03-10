import { SyntaxNode } from "web-tree-sitter";
import {
  cascadingMatcher,
  chainedMatcher,
  createPatternMatchers,
  leadingMatcher,
  matcher,
  trailingMatcher,
  typeMatcher,
  conditionMatcher,
  patternMatcher,
} from "../util/nodeMatchers";
import { NodeMatcherAlternative } from "../typings/Types";
import { SimpleScopeTypeType } from "../typings/targetDescriptor.types";
import { nodeFinder, typedNodeFinder } from "../util/nodeFinders";
import { delimitedSelector } from "../util/nodeSelectors";

// Generated by the following command:
// > curl https://raw.githubusercontent.com/tree-sitter/tree-sitter-c-sharp/master/src/node-types.json \
//   | jq '.[] | select(.type == "_expression") | [.subtypes[].type]'
const EXPRESSION_TYPES = [
  "anonymous_method_expression",
  "anonymous_object_creation_expression",
  "array_creation_expression",
  "as_expression",
  "assignment_expression",
  "await_expression",
  "base_expression",
  "binary_expression",
  "boolean_literal",
  "cast_expression",
  "character_literal",
  "checked_expression",
  "conditional_access_expression",
  "conditional_expression",
  "default_expression",
  "element_access_expression",
  "element_binding_expression",
  "generic_name",
  "global",
  "identifier",
  "implicit_array_creation_expression",
  "implicit_object_creation_expression",
  "implicit_stack_alloc_array_creation_expression",
  "initializer_expression",
  "integer_literal",
  "interpolated_string_expression",
  "invocation_expression",
  "is_expression",
  "is_pattern_expression",
  "lambda_expression",
  "make_ref_expression",
  "member_access_expression",
  "null_literal",
  "object_creation_expression",
  "parenthesized_expression",
  "postfix_unary_expression",
  "prefix_unary_expression",
  "query_expression",
  "range_expression",
  "real_literal",
  "ref_expression",
  "ref_type_expression",
  "ref_value_expression",
  "size_of_expression",
  "stack_alloc_array_creation_expression",
  "string_literal",
  "switch_expression",
  "this_expression",
  "throw_expression",
  "tuple_expression",
  "type_of_expression",
  "verbatim_string_literal",
  "with_expression",
];

function isExpression(node: SyntaxNode) {
  return EXPRESSION_TYPES.includes(node.type);
}

// Generated by the following command:
// > curl https://raw.githubusercontent.com/tree-sitter/tree-sitter-c-sharp/master/src/node-types.json \
//   | jq '.[] | select(.type == "_statement" or .type == "_declaration") | [.subtypes[].type]'
const STATEMENT_TYPES = [
  "class_declaration",
  "constructor_declaration",
  "conversion_operator_declaration",
  "delegate_declaration",
  "destructor_declaration",
  "enum_declaration",
  "event_declaration",
  "event_field_declaration",
  "field_declaration",
  "indexer_declaration",
  "interface_declaration",
  "method_declaration",
  "namespace_declaration",
  "operator_declaration",
  "property_declaration",
  "record_declaration",
  "struct_declaration",
  "using_directive",
  "block",
  "break_statement",
  "checked_statement",
  "continue_statement",
  "do_statement",
  "empty_statement",
  "expression_statement",
  "fixed_statement",
  "for_each_statement",
  "for_statement",
  "goto_statement",
  "if_statement",
  "labeled_statement",
  "local_declaration_statement",
  "local_function_statement",
  "lock_statement",
  "return_statement",
  "switch_statement",
  "throw_statement",
  "try_statement",
  "unsafe_statement",
  "using_statement",
  "while_statement",
  "yield_statement",
];

const NAMED_FUNCTION_TYPES = [
  "delegate_declaration",
  "local_function_statement",
  "method_declaration",
];

// Generated by the following command:
// > curl https://raw.githubusercontent.com/tree-sitter/tree-sitter-c-sharp/master/src/node-types.json \
// jq '.[] | select(has("children")) | select(any(.children.types[]; .type == "initializer_expression")) | .type'
// this is then filtered by hand to separate arrays from objects
const LIST_TYPES_WITH_INITIALIZERS_AS_CHILDREN = [
  "array_creation_expression",
  "implicit_array_creation_expression",
  "implicit_stack_alloc_array_creation_expression",
  "stack_alloc_array_creation_expression",
];

const OBJECT_TYPES_WITH_INITIALIZERS_AS_CHILDREN = [
  "implicit_object_creation_expression",
];

// Every array or map initializer contains its contents in a initializer_expression.
// There appears to be no distinction between dictionaries and arrays as far as the syntax tree goes.
// that means some of the commands for maps may work on arrays, and some of the commands for arrays may work on maps.
const getChildInitializerNode = (node: SyntaxNode) =>
  node.children.find((child) => child.type === "initializer_expression") ??
  null;

const getInitializerNode = (node: SyntaxNode) =>
  node.childForFieldName("initializer");

const makeDelimitedSelector = (leftType: string, rightType: string) =>
  delimitedSelector(
    (node) =>
      node.type === "," || node.type === leftType || node.type === rightType,
    ", "
  );

const getMapMatchers = {
  map: cascadingMatcher(
    chainedMatcher([
      typedNodeFinder(...OBJECT_TYPES_WITH_INITIALIZERS_AS_CHILDREN),
      getChildInitializerNode,
    ]),
    chainedMatcher([
      typedNodeFinder("object_creation_expression"),
      getInitializerNode,
    ])
  ),
  collectionKey: chainedMatcher([
    typedNodeFinder("assignment_expression"),
    (node: SyntaxNode) => node.childForFieldName("left"),
  ]),
  value: leadingMatcher(
    [
      "variable_declaration?.variable_declarator[1][0]!",
      "assignment_expression[right]",
    ],
    ["assignment_operator"]
  ),
  list: cascadingMatcher(
    chainedMatcher([
      typedNodeFinder(...LIST_TYPES_WITH_INITIALIZERS_AS_CHILDREN),
      getChildInitializerNode,
    ]),
    chainedMatcher([
      typedNodeFinder("object_creation_expression"),
      (node: SyntaxNode) => node.childForFieldName("initializer"),
    ])
  ),
  collectionItem: matcher(
    nodeFinder(
      (node) =>
        (node.parent?.type === "initializer_expression" &&
          isExpression(node)) ||
        node.type === "assignment_expression"
    ),
    delimitedSelector(
      (node) =>
        node.type === "," ||
        node.type === "[" ||
        node.type === "]" ||
        node.type === "}" ||
        node.type === "{",
      ", "
    )
  ),
  string: typeMatcher("string_literal"),
};

const nodeMatchers: Partial<
  Record<SimpleScopeTypeType, NodeMatcherAlternative>
> = {
  ...getMapMatchers,
  ifStatement: "if_statement",
  class: "class_declaration",
  className: "class_declaration[name]",
  condition: cascadingMatcher(
    conditionMatcher("*[condition]"),
    patternMatcher("while_statement[0]")
  ),
  statement: STATEMENT_TYPES,
  anonymousFunction: "lambda_expression",
  functionCall: "invocation_expression",
  argumentOrParameter: matcher(
    nodeFinder(
      (node) =>
        node.parent?.type === "argument_list" || node.type === "parameter"
    ),
    makeDelimitedSelector("(", ")")
  ),
  namedFunction: NAMED_FUNCTION_TYPES,
  functionName: NAMED_FUNCTION_TYPES.map((t) => t + "[name]"),
  comment: "comment",
  regularExpression: "regex",
  type: trailingMatcher(["*[type]"]),
  name: [
    "variable_declaration?.variable_declarator.identifier!",
    "assignment_expression[left]",
    "*[name]",
  ],
};

export default createPatternMatchers(nodeMatchers);
