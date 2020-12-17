Path forward for Merkle-tree replication
========================================

The current state of affairs with the Merkle-tree replication is messy. In
particular we uncovered some show-stoppers for our initial intented approach.
The plan to use the document revision as the primary identifier in the storage
engine will not work. Some of our APIs allow you to specify a document revision,
and we cannot avoid the case where the server accepts a document with a revision
which has previously been used but is no longer contained in the database. This
case causes problems for IResearch as well as RocksDB. The latter could be
worked around easily, though at an unknown performance cost. The former would
require an unknown (potentially significant) amount of effort to work around,
and also incur a performance penalty.

Furthermore, the upgrade path in the cluster to convert from an old storage
format to a new one is messy, fragile, and likely not to work. We had some ideas
about a different upgrade procedure in the cluster, but they still build on the
fundamentally flawed approach with the new storage format.

Instead, the path forward seems to lie with keeping the storage format the same
as before, and providing a workaround in order to address documents by revision.
This can be achieved simply by creating an additional index which maps revisions
to primary identifiers. It is possible, though unlikely, that there are multiple
primary identifiers associated with the same revision in the case of a non-local
smart edge collection created before 3.7.

Undoing the storage format changes
----------------------------------

We will need to roll back most of the storage format changes introduced, though
disabled, in the 3.7 codebase. These are still enabled by default in devel. We
will want to keep the changes which enable cluster-wide unique revisions in
smart edge collections; however any changes which involve the use of revisions
as primary identifiers will need to be undone.

We will likely want to push this through as a first step before making any
additional changes. I would estimate that this should only take a few developer
days to get a functional PR, though the testing and review cycle may add
another few days.

Revision index
--------------

The revision index type will, as with other index types, get its own column
family in RocksDB. It can use the default comparator, so operation should be
efficient. It will use 16-byte keys: an object ID for the collection followed
by a revision ID for the document. The value will simply be a concatenation of
any primary identifiers for documents which have this same revision, resulting
in a value with a non-zero length divisible by 8.

We likely will not want to put a cache in front of this index other than the
RocksDB block cache. In particular, the access patterns are not likely to be
particularly well-suited to our caching system. We are likely to write each key
once and read it seldomly if at all. Further, given the nature of revisions, and
the replication protocols we are using, it is likely that we will access them in
chunks, and the RocksDB cache is already well-suited to this pattern.

We can add the revision index on its own. The only client expected to use the
revision index is the replication protocol, though it could in theory serve
any queries which sort or filter based on revision. This would allow us to test
the index independently of the protocol.

Implementation can be expected to take a couple developer days, while testing
could take another few days.

Adapting the replication protocol to use the revision index
-----------------------------------------------------------

The replication protocol currently just requires that it can fetch and remove
documents by revision. The API surface for these requests is relatively small,
and can probably be adapted to use the index with a few days work. That said,
there is likely a good deal of additional testing, refactoring, and performance
evaluation that must be done at this stage of the project. I would estimate only
a few developer days for the initial coding work, but possibly as long as 2-4
weeks to properly test, evaluate, and get this across the finish line.

Defaults
--------

We likely do not want to enable the revision index and syncing by revision on
a given collection by default. The index takes additional space on disk and in
the RocksDB block cache, the revision tree takes a few megabytes of RAM, and
there is a small penalty to write performance to maintain the index entries.

Instead, we will want to make it simple to create a revision index for a
collection, which will then enable sync by revision behavior. This makes the
"upgrade" procedure for a given collection very simple and leverages existing
machinery to accomplish the task robustly in the cluster.
